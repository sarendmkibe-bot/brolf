import { Router } from 'express';
import { z } from 'zod';
import pool from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
});

// Public: anyone can list categories
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (err) {
    next(err);
  }
});

// Admin only: create a category
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
      [parsed.data.name]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    next(err);
  }
});

export default router;