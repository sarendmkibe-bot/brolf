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



// Sales report with date filtering
router.get('/reports/sales', async (req, res, next) => {
  try {
    const dateSchema = z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value;
      });

    const querySchema = z.object({
      startDate: dateSchema.optional(),
      endDate: dateSchema.optional(),
    });

    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const { startDate, endDate } = parsed.data;

    if (Boolean(startDate) !== Boolean(endDate)) {
      return res.status(400).json({
        error: 'Both startDate and endDate are required.',
      });
    }

    if (startDate && startDate > endDate) {
      return res.status(400).json({
        error: 'Start date cannot be after end date.',
      });
    }

    const dateParams = [startDate || null, endDate || null];

    const dateBounds = `
      WITH date_bounds AS (
        SELECT
          COALESCE($1::date, CURRENT_DATE - INTERVAL '6 days') AS start_date,
          COALESCE($2::date, CURRENT_DATE) AS end_date
      )
    `;

    const [
      totals,
      byStatus,
      topProducts,
      revenueByDay,
      paymentsByMethod,
    ] = await Promise.all([

      // Orders and revenue within selected dates
      pool.query(
        `${dateBounds}
         SELECT
           COUNT(*)::int AS orders,
           COALESCE(SUM(o.total), 0)::float8 AS revenue
         FROM orders o
         CROSS JOIN date_bounds d
         WHERE o.status NOT IN ('cancelled', 'awaiting_payment')
           AND o.created_at >= d.start_date
           AND o.created_at < d.end_date + INTERVAL '1 day'`,
        dateParams
      ),

      // All-time orders grouped by status
      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM orders
         GROUP BY status
         ORDER BY status`
      ),

      // All-time top five selling products
      pool.query(
        `SELECT p.id, p.name,
                SUM(oi.quantity)::int AS units_sold,
                SUM(oi.quantity * oi.unit_price)::float8 AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE o.status NOT IN ('cancelled', 'awaiting_payment')
         GROUP BY p.id, p.name
         ORDER BY units_sold DESC
         LIMIT 5`
      ),

      // Revenue for every day in the selected range
      pool.query(
        `${dateBounds}
         SELECT
           days.day::date AS day,
           COALESCE(SUM(o.total), 0)::float8 AS revenue
         FROM date_bounds d
         CROSS JOIN LATERAL generate_series(
           d.start_date,
           d.end_date,
           INTERVAL '1 day'
         ) AS days(day)
         LEFT JOIN orders o
           ON o.created_at >= days.day
           AND o.created_at < days.day + INTERVAL '1 day'
           AND o.status NOT IN ('cancelled', 'awaiting_payment')
         GROUP BY days.day
         ORDER BY days.day`,
        dateParams
      ),

      // Payment methods within selected dates
      pool.query(
        `${dateBounds}
         SELECT
           pay.method,
           COUNT(*)::int AS transactions,
           COALESCE(SUM(pay.amount), 0)::float8 AS amount
         FROM payments pay
         JOIN orders o ON o.id = pay.order_id
         CROSS JOIN date_bounds d
         WHERE o.status NOT IN ('cancelled', 'awaiting_payment')
           AND pay.status IN ('paid', 'simulated')
           AND o.created_at >= d.start_date
           AND o.created_at < d.end_date + INTERVAL '1 day'
         GROUP BY pay.method
         ORDER BY amount DESC`,
        dateParams
      ),
    ]);

    res.json({
      totals: totals.rows[0],
      orders_by_status: byStatus.rows,
      top_products: topProducts.rows,
      revenue_by_day: revenueByDay.rows,
      payments_by_method: paymentsByMethod.rows,
    });

  } catch (err) {
    next(err);
  }
});

export default router;