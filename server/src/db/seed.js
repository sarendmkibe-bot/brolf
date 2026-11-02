import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const categories = [
  'Food & Coffee',
  'Clothing & Textiles',
  'Handicrafts',
  'Electronics',
  'Home & Living',
  'Beauty & Health',
];

const sellers = [
  { name: 'Abeba Coffee Co', email: 'abeba@markethub.test' },
  { name: 'Selam Crafts', email: 'selam@markethub.test' },
  { name: 'Addis Tech Hub', email: 'addistech@markethub.test' },
];

const image = (text) =>
  `https://placehold.co/600x400/1a2822/22c55e.png?text=${text.replace(/ /g, '+')}`;

// seller = index into the sellers list above
const products = [
  { seller: 0, category: 'Food & Coffee', name: 'Yirgacheffe Coffee Beans 1kg', description: 'Light roast with floral and citrus notes, grown in the Gedeo zone.', price: 850, stock: 40, img: 'Yirgacheffe Coffee' },
  { seller: 0, category: 'Food & Coffee', name: 'Sidamo Ground Coffee 500g', description: 'Medium roast, ground fresh for filter or moka pot.', price: 520, stock: 60, img: 'Sidamo Coffee' },
  { seller: 0, category: 'Food & Coffee', name: 'Pure Forest Honey 1kg', description: 'Raw, unprocessed honey collected from forest hives.', price: 700, stock: 25, img: 'Forest Honey' },
  { seller: 1, category: 'Clothing & Textiles', name: 'Handwoven Cotton Netela', description: 'Traditional white cotton shawl with a colorful woven border.', price: 1200, stock: 15, img: 'Cotton Netela' },
  { seller: 1, category: 'Clothing & Textiles', name: 'Habesha Kemis Dress', description: 'Hand-embroidered cotton dress for holidays and weddings.', price: 4500, stock: 6, img: 'Habesha Kemis' },
  { seller: 1, category: 'Clothing & Textiles', name: 'Leather Messenger Bag', description: 'Genuine leather bag, hand-stitched in Addis Ababa.', price: 2800, stock: 0, img: 'Leather Bag' },
  { seller: 1, category: 'Handicrafts', name: 'Clay Jebena Coffee Pot', description: 'Handmade clay pot for the traditional coffee ceremony.', price: 650, stock: 20, img: 'Clay Jebena' },
  { seller: 1, category: 'Handicrafts', name: 'Woven Mesob Basket', description: 'Colorful hand-woven basket for serving injera.', price: 1800, stock: 8, img: 'Mesob Basket' },
  { seller: 1, category: 'Home & Living', name: 'Hand-carved Wooden Spoon Set', description: 'Set of four olive-wood spoons, finished with natural oil.', price: 380, stock: 30, img: 'Wooden Spoons' },
  { seller: 1, category: 'Beauty & Health', name: 'Shea Butter Body Cream 250ml', description: 'Rich moisturizing cream with no added fragrance.', price: 300, stock: 50, img: 'Shea Butter' },
  { seller: 2, category: 'Electronics', name: 'Wireless Bluetooth Earbuds', description: 'Up to 20 hours of battery with the charging case.', price: 1450, stock: 35, img: 'Bluetooth Earbuds' },
  { seller: 2, category: 'Electronics', name: '20000mAh Power Bank', description: 'Fast-charging power bank with two USB ports.', price: 1900, stock: 4, img: 'Power Bank' },
];

try {
  for (const name of categories) {
    await pool.query(
      'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    );
  }

  const passwordHash = await bcrypt.hash('Password123', 10);

  const sellerIds = [];
  for (const s of sellers) {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'seller')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [s.name, s.email, passwordHash]
    );
    sellerIds.push(result.rows[0].id);
  }

  // Make sure a demo admin exists (does nothing if the email is already registered)
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin', 'admin@example.com', $1, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [passwordHash]
  );

  const catRows = await pool.query('SELECT id, name FROM categories');
  const catId = Object.fromEntries(catRows.rows.map((r) => [r.name, r.id]));

  let added = 0;
  for (const p of products) {
    const sellerId = sellerIds[p.seller];
    const exists = await pool.query(
      'SELECT 1 FROM products WHERE name = $1 AND seller_id = $2',
      [p.name, sellerId]
    );
    if (exists.rowCount > 0) continue;

    await pool.query(
      `INSERT INTO products (seller_id, category_id, name, description, price, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sellerId, catId[p.category], p.name, p.description, p.price, p.stock, image(p.img)]
    );
    added++;
  }

  console.log(`Seed finished: ${added} new products added`);
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}