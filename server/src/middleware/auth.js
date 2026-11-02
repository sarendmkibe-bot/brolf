import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Always use the current role and status from the database, not the token
    const result = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [payload.id]
    );
    const row = result.rows[0];
    if (!row || !row.is_active) {
      return res.status(401).json({ error: 'Account disabled or not found' });
    }
    req.user = { id: row.id, role: row.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}