import { Router } from 'express';
import { z } from 'zod';
import pool from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// Every route in this file is admin-only
router.use(requireAuth, requireRole('admin'));

const idSchema = z.coerce.number().int().positive();
const userUpdateSchema = z.object({ is_active: z.boolean() });

router.get('/users', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users ORDER BY created_at DESC LIMIT 500`
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// Activate or deactivate an account
router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = idSchema.safeParse(req.params.id);
    const parsed = userUpdateSchema.safeParse(req.body);
    if (!id.success || !parsed.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    if (id.data === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own account status' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [parsed.data.is_active, id.data]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.status, o.total::float8 AS total, o.created_at,
              u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       ORDER BY o.created_at DESC LIMIT 200`
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
});

// Basic sales report (cancelled orders are not counted as sales)
router.get('/reports/sales', async (req, res, next) => {
  try {
    const [totals, byStatus, topProducts] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::float8 AS revenue
         FROM orders WHERE status <> 'cancelled'`
      ),
      pool.query('SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY status'),
      pool.query(
        `SELECT p.id, p.name,
                SUM(oi.quantity)::int AS units_sold,
                SUM(oi.quantity * oi.unit_price)::float8 AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE o.status <> 'cancelled'
         GROUP BY p.id, p.name
         ORDER BY units_sold DESC
         LIMIT 5`
      ),
    ]);

    res.json({
      totals: totals.rows[0],
      orders_by_status: byStatus.rows,
      top_products: topProducts.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;