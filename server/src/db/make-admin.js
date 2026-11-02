import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node src/db/make-admin.js <email> <password>');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ('Admin', $1, $2, 'admin', TRUE)
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, role = 'admin', is_active = TRUE
     RETURNING id, email, role`,
    [email.toLowerCase(), hash]
  );
  console.log('Admin ready:', result.rows[0]);
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}