import 'dotenv/config';
import pool from '../config/db.js';

const categories = [
  'Food & Coffee',
  'Clothing & Textiles',
  'Handicrafts',
  'Electronics',
  'Home & Living',
  'Beauty & Health',
];

try {
  for (const name of categories) {
    await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    );
  }
  console.log('Categories seeded');
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}