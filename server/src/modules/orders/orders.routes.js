import { Router } from 'express';
import { z } from 'zod';
import pool from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const idSchema = z.coerce.number().int().positive();

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(50),
});

const statusSchema = z.object({
  status: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled']),
});

// Which status changes are allowed
const transitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const ITEMS_JSON = `json_agg(json_build_object(
  'product_id', oi.product_id,
  'name', p.name,
  'quantity', oi.quantity,
  'unit_price', oi.unit_price::float8
) ORDER BY oi.id) AS items`;

// Customer: place an order. Everything happens in one transaction,
// so stock can never go negative and a failed order leaves no partial data.
router.post('/', requireAuth, requireRole('customer'), async (req, res, next) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  // Merge duplicate products and sort ids so concurrent orders lock rows in the same order
  const wanted = new Map();
  for (const item of parsed.data.items) {
    wanted.set(item.product_id, (wanted.get(item.product_id) || 0) + item.quantity);
  }
  const ids = [...wanted.keys()].sort((a, b) => a - b);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query(
      `SELECT id, seller_id, name, price, stock
       FROM products
       WHERE id = ANY($1::int[]) AND is_active = TRUE
       ORDER BY id
       FOR UPDATE`,
      [ids]
    );

    if (found.rows.length !== ids.length) {
      throw new HttpError(400, 'One or more products are unavailable');
    }

    let totalCents = 0;
    for (const product of found.rows) {
      const qty = wanted.get(product.id);
      if (product.stock < qty) {
        throw new HttpError(409, `Not enough stock for "${product.name}"`);
      }
      totalCents += Math.round(Number(product.price) * 100) * qty;
    }
    const total = totalCents / 100;

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, total)
       VALUES ($1, $2)
       RETURNING id, status, created_at`,
      [req.user.id, total]
    );
    const order = orderResult.rows[0];

    for (const product of found.rows) {
      const qty = wanted.get(product.id);
      await client.query(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, product.id, product.seller_id, qty, product.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, product.id]);
    }

    // Simulated payment record: no real money, no card data
    await client.query(
      `INSERT INTO payments (order_id, amount, method, status)
       VALUES ($1, $2, 'simulated', 'simulated')`,
      [order.id, total]
    );

    await client.query('COMMIT');
    res.status(201).json({
      order: { id: order.id, status: order.status, total, created_at: order.created_at },
      payment: { method: 'simulated', status: 'simulated' },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  } finally {
    client.release();
  }
});

// Customer: my order history
router.get('/', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.total::float8 AS total, o.created_at, ${ITEMS_JSON}
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.customer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// Seller: orders that include my products (only my items are shown)
router.get('/seller', requireAuth, requireRole('seller'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.created_at, u.name AS customer_name, ${ITEMS_JSON},
              SUM(oi.quantity * oi.unit_price)::float8 AS seller_total
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       JOIN users u ON u.id = o.customer_id
       WHERE oi.seller_id = $1
       GROUP BY o.id, u.name
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// Update order status.
// Customers can only cancel their own pending orders; sellers can update orders
// that contain their products; admins can update any order.
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const newStatus = parsed.data.status;
  const { role, id: userId } = req.user;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const found = await client.query(
      'SELECT id, customer_id, status FROM orders WHERE id = $1 FOR UPDATE',
      [id.data]
    );
    const order = found.rows[0];
    if (!order) throw new HttpError(404, 'Order not found');

    if (role === 'customer') {
      if (order.customer_id !== userId) throw new HttpError(404, 'Order not found');
      if (newStatus !== 'cancelled') throw new HttpError(403, 'Customers can only cancel orders');
      if (order.status !== 'pending') throw new HttpError(409, 'Only pending orders can be cancelled');
    } else if (role === 'seller') {
      const mine = await client.query(
        'SELECT 1 FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1',
        [order.id, userId]
      );
      if (!mine.rows[0]) throw new HttpError(404, 'Order not found');
    }

    if (!transitions[order.status].includes(newStatus)) {
      throw new HttpError(409, `Cannot change an order from ${order.status} to ${newStatus}`);
    }

    await client.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order.id]);

    // A cancelled order puts its items back in stock
    if (newStatus === 'cancelled') {
      await client.query(
        `UPDATE products
         SET stock = products.stock + oi.quantity
         FROM order_items oi
         WHERE oi.order_id = $1 AND products.id = oi.product_id`,
        [order.id]
      );
    }

    await client.query('COMMIT');
    res.json({ order: { id: order.id, status: newStatus } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  } finally {
    client.release();
  }
});

export default router;