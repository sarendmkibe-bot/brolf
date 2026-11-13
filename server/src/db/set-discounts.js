import 'dotenv/config';
import pool from '../config/db.js';

// Gives about half of the products a crossed-out old price, so the deals row has something to show
try {
  const result = await pool.query(
    `UPDATE products
     SET original_price = CEIL(price * (1.15 + (id % 4) * 0.1))
     WHERE id % 2 = 0 AND is_active = TRUE`
  );
  console.log(`Added a discount to ${result.rowCount} products`);
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}