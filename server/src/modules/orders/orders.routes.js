import { Router } from 'express';
import { z } from 'zod';
import pool from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { paymentMode, newTxRef, initializePayment } from '../payments/chapa.js';
import { cancelAwaitingOrder } from '../payments/service.js';

const router = Router();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const idSchema = z.coerce.number().int().positive();

const REGIONS = [
  'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela', 'Harari',
  'Oromia', 'Sidama', 'Somali', 'South Ethiopia', 'South West Ethiopia', 'Tigray',
];

// Keep in sync with Checkout.jsx. The server's number is the one that is charged.
const shippingFee = (region, subtotal) =>
  subtotal >= 2000 ? 0 : region === 'Addis Ababa' ? 80 : 150;

const shippingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[79]\d{8}$/, 'Enter 9 digits, for example 912864228'),
  street: z.string().trim().min(2).max(200),
  unit: z.string().trim().max(100).default(''),
  region: z.enum(REGIONS),
  city: z.string().trim().min(2).max(100),
  zip: z.string().trim().max(20).default(''),
});

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
  payment_method: z.enum(['online', 'cod']),
  shipping: shippingSchema,
});

const statusSchema = z.object({
  status: z.enum(['confirmed', 'shipped', 'delivered', 'cancelled']),
});

// Which status changes are allowed
const transitions = {
  awaiting_payment: ['cancelled'],
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

const PAYMENT_JSON = `(SELECT json_build_object(
    'status', pay.status, 'method', pay.method,
    'tx_ref', pay.tx_ref, 'checkout_url', pay.checkout_url)
  FROM payments pay WHERE pay.order_id = o.id ORDER BY pay.id DESC LIMIT 1) AS payment`;

// Customer: place an order. Stock is checked and reserved in one transaction,
// so it can never go negative and a failed order leaves no partial data.
router.post('/', requireAuth, requireRole('customer'), async (req, res, next) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const { shipping } = parsed.data;

  // Merge duplicate products and sort ids so concurrent orders lock rows in the same order
  const wanted = new Map();
  for (const item of parsed.data.items) {
    wanted.set(item.product_id, (wanted.get(item.product_id) || 0) + item.quantity);
  }
  const ids = [...wanted.keys()].sort((a, b) => a - b);

  // "online" uses your PAYMENT_MODE (chapa or simulated); "cod" is always cash on delivery
  const mode = parsed.data.payment_method === 'cod' ? 'cod' : paymentMode();
  const txRef = mode === 'chapa' ? newTxRef() : null;
  let order;
  let total;
  let fee;

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
    fee = shippingFee(shipping.region, totalCents / 100);
    total = (totalCents + fee * 100) / 100;

    const orderResult = await client.query(
      `INSERT INTO orders
         (customer_id, total, status, shipping_fee, shipping_name, shipping_phone,
          shipping_street, shipping_unit, shipping_region, shipping_city, shipping_zip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, status, created_at`,
      [
        req.user.id,
        total,
        mode === 'chapa' ? 'awaiting_payment' : 'pending',
        fee,
        shipping.name,
        shipping.phone,
        shipping.street,
        shipping.unit,
        shipping.region,
        shipping.city,
        shipping.zip,
      ]
    );
    order = orderResult.rows[0];

    for (const product of found.rows) {
      const qty = wanted.get(product.id);
      await client.query(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, product.id, product.seller_id, qty, product.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, product.id]);
    }

    // No card or mobile-money details are ever stored, only a reference
    const payStatus = { chapa: 'pending', cod: 'cod', simulated: 'simulated' }[mode];
    await client.query(
      `INSERT INTO payments (order_id, amount, method, status, tx_ref)
       VALUES ($1, $2, $3, $4, $5)`,
      [order.id, total, mode, payStatus, txRef]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  } finally {
    client.release();
  }

  const orderJson = {
    id: order.id,
    status: order.status,
    total,
    shipping_fee: fee,
    created_at: order.created_at,
  };

  if (mode !== 'chapa') {
    return res.status(201).json({
      order: orderJson,
      payment: { method: mode, status: mode === 'cod' ? 'cod' : 'simulated' },
    });
  }

  // Real payments: start the transaction with Chapa and hand back the payment page
  try {
    const buyer = (
      await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id])
    ).rows[0];
    const checkoutUrl = await initializePayment({
      txRef,
      amount: total,
      email: buyer.email,
      name: buyer.name,
      orderId: order.id,
    });
    await pool.query('UPDATE payments SET checkout_url = $1 WHERE tx_ref = $2', [checkoutUrl, txRef]);

    res.status(201).json({
      order: orderJson,
      payment: { method: 'chapa', status: 'pending', tx_ref: txRef, checkout_url: checkoutUrl },
    });
  } catch (err) {
    console.error(err); // Chapa's real error message is printed here
    await cancelAwaitingOrder(order.id, 'failed').catch(console.error);
    res.status(502).json({ error: 'The payment provider is unavailable. Please try again.' });
  }
});

// Customer: my order history
router.get('/', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.total::float8 AS total, o.shipping_fee::float8 AS shipping_fee,
              o.shipping_city, o.shipping_region, o.created_at, ${ITEMS_JSON}, ${PAYMENT_JSON}
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

// Seller: paid orders that include my products (only my items are shown)
router.get('/seller', requireAuth, requireRole('seller'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.created_at, u.name AS customer_name,
              o.shipping_name, o.shipping_phone, o.shipping_street, o.shipping_unit,
              o.shipping_city, o.shipping_region, ${ITEMS_JSON},
              SUM(oi.quantity * oi.unit_price)::float8 AS seller_total
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       JOIN users u ON u.id = o.customer_id
       WHERE oi.seller_id = $1 AND o.status <> 'awaiting_payment'
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
// Customers can only cancel their own unpaid orders; sellers can update orders
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
      const pay = (
        await client.query(
          'SELECT method FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1',
          [order.id]
        )
      ).rows[0];
      const unpaidOnline = order.status === 'awaiting_payment';
      const notYetConfirmed =
        order.status === 'pending' && pay && ['cod', 'simulated'].includes(pay.method);
      if (!unpaidOnline && !notYetConfirmed) {
        throw new HttpError(409, 'This order can no longer be cancelled');
      }
    } else if (role === 'seller') {
      const mine = await client.query(
        'SELECT 1 FROM order_items WHERE order_id = $1 AND seller_id = $2 LIMIT 1',
        [order.id, userId]
      );
      if (!mine.rows[0] || order.status === 'awaiting_payment') {
        throw new HttpError(404, 'Order not found');
      }
    }

    if (!transitions[order.status].includes(newStatus)) {
      throw new HttpError(409, `Cannot change an order from ${order.status} to ${newStatus}`);
    }

    await client.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, order.id]);

    if (newStatus === 'cancelled') {
      // Items go back in stock
      await client.query(
        `UPDATE products
         SET stock = products.stock + oi.quantity
         FROM order_items oi
         WHERE oi.order_id = $1 AND products.id = oi.product_id`,
        [order.id]
      );
      // A paid order needs a refund; an unpaid one is simply closed
      await client.query(
        `UPDATE payments
         SET status = CASE WHEN status = 'paid' THEN 'refund_due'
                           WHEN status IN ('pending', 'cod') THEN 'cancelled'
                           ELSE status END
         WHERE order_id = $1`,
        [order.id]
      );
    }

    // Cash on delivery: the money is collected when the order is delivered
    if (newStatus === 'delivered') {
      await client.query(
        "UPDATE payments SET status = 'paid', paid_at = NOW() WHERE order_id = $1 AND status = 'cod'",
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