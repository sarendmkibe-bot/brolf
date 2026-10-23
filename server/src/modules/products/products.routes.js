import { Router } from 'express';
import { z } from 'zod';
import pool from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

const idSchema = z.coerce.number().int().positive();

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().min(0).max(10000000),
  stock: z.coerce.number().int().min(0).max(1000000),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  image_url: z.string().trim().url().max(2000).optional(),
});

const updateSchema = productSchema
  .partial()
  .extend({ is_active: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const PRODUCT_COLUMNS = `
  p.id, p.name, p.description, p.price::float8 AS price, p.stock,
  p.image_url, p.is_active, p.category_id,
  c.name AS category_name, u.name AS seller_name, p.seller_id
`;

// Public: list active products with search, filters and pagination
router.get('/', async (req, res, next) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { search, category, minPrice, maxPrice, page, limit } = parsed.data;

    const conditions = ['p.is_active = TRUE'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`
      );
    }
    if (category) {
      params.push(category);
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (minPrice !== undefined) {
      params.push(minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }
    if (maxPrice !== undefined) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products p WHERE ${where}`,
      params
    );

    params.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.seller_id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      products: result.rows,
      page,
      limit,
      total: countResult.rows[0].total,
    });
  } catch (err) {
    next(err);
  }
});

// Seller/admin: list my own products (including inactive ones)
router.get('/mine', requireAuth, requireRole('seller', 'admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.seller_id
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ products: result.rows });
  } catch (err) {
    next(err);
  }
});

// Public: single product details
router.get('/:id', async (req, res, next) => {
  try {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const result = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = p.seller_id
       WHERE p.id = $1 AND p.is_active = TRUE`,
      [id.data]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Seller/admin: create a product (the seller is always the logged-in user)
router.post('/', requireAuth, requireRole('seller', 'admin'), async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, description, price, stock, category_id, image_url } = parsed.data;
    const result = await pool.query(
      `INSERT INTO products (seller_id, category_id, name, description, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, price::float8 AS price, stock, image_url, category_id, is_active`,
      [req.user.id, category_id ?? null, name, description ?? null, price, stock, image_url ?? null]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Category does not exist' });
    }
    next(err);
  }
});

// Find a product and make sure the caller owns it (admins can edit any)
async function loadEditableProduct(req, res) {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: 'Invalid product id' });
    return null;
  }

  const result = await pool.query('SELECT id, seller_id FROM products WHERE id = $1', [id.data]);
  const product = result.rows[0];

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }
  if (req.user.role !== 'admin' && product.seller_id !== req.user.id) {
    res.status(403).json({ error: 'You can only change your own products' });
    return null;
  }
  return product;
}

// Seller/admin: update a product or its stock
router.put('/:id', requireAuth, requireRole('seller', 'admin'), async (req, res, next) => {
  try {
    const product = await loadEditableProduct(req, res);
    if (!product) return;

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    // Column names come from the validated schema, never directly from the request
    const sets = [];
    const values = [];
    for (const [key, value] of Object.entries(parsed.data)) {
      values.push(value);
      sets.push(`${key} = $${values.length}`);
    }
    values.push(product.id);

    const result = await pool.query(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, description, price::float8 AS price, stock, image_url, category_id, is_active`,
      values
    );

    res.json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Category does not exist' });
    }
    next(err);
  }
});

// Seller/admin: deactivate a product (kept in the database so old orders still work)
router.delete('/:id', requireAuth, requireRole('seller', 'admin'), async (req, res, next) => {
  try {
    const product = await loadEditableProduct(req, res);
    if (!product) return;

    await pool.query('UPDATE products SET is_active = FALSE WHERE id = $1', [product.id]);
    res.json({ message: 'Product deactivated', id: product.id });
  } catch (err) {
    next(err);
  }
});

export default router;