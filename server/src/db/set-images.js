import 'dotenv/config';
import pool from '../config/db.js';

const files = {
  'Ethiopian Coffee 1kg': 'yirgacheffe-coffee',
  'Yirgacheffe Coffee Beans 1kg': 'yirgacheffe-coffee',
  'Sidamo Ground Coffee 500g': 'sidamo-coffee',
  'Pure Forest Honey 1kg': 'forest-honey',
  'Handwoven Cotton Netela': 'cotton-netela',
  'Habesha Kemis Dress': 'habesha-kemis',
  'Leather Messenger Bag': 'leather-bag',
  'Clay Jebena Coffee Pot': 'clay-jebena',
  'Woven Mesob Basket': 'mesob-basket',
  'Hand-carved Wooden Spoon Set': 'wooden-spoons',
  'Shea Butter Body Cream 250ml': 'shea-butter',
  'Wireless Bluetooth Earbuds': 'bluetooth-earbuds',
  '20000mAh Power Bank': 'power-bank',
};

try {
  let updated = 0;
  for (const [name, file] of Object.entries(files)) {
    const result = await pool.query('UPDATE products SET image_url = $1 WHERE name = $2', [
      `/products/${file}.jpg`,
      name,
    ]);
    updated += result.rowCount;
  }
  console.log(`Updated images for ${updated} products`);
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}