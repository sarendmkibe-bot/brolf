import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Tests use their own database so your real data is never touched
process.env.DB_NAME = 'markethub_test';
// Tests always run with simulated payments, whatever your .env says
process.env.PAYMENT_MODE = 'simulated';

const { default: app } = await import('../src/app.js');
const { default: pool } = await import('../src/config/db.js');
const { expireUnpaidOrders } = await import('../src/modules/payments/service.js');

const PASSWORD = 'Password123';
const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

// A valid delivery address; individual tests change parts of it
const ADDRESS = {
  name: 'Test Customer',
  phone: '912864228',
  street: 'Bole Road',
  unit: '',
  region: 'Addis Ababa',
  city: 'Addis Ababa',
  zip: '',
};

function placeOrder(user, items, { method = 'online', shipping = {} } = {}) {
  return request(app)
    .post('/api/orders')
    .set(auth(user))
    .send({ items, payment_method: method, shipping: { ...ADDRESS, ...shipping } });
}

async function signup(name, email, role = 'customer') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: PASSWORD, role });
  assert.equal(res.status, 201);
  return { ...res.body.user, token: res.body.token };
}

let customer, seller, otherSeller, admin;
let productId, order1Id;

const coffee = (quantity) => [{ product_id: productId, quantity }];

async function stockOf() {
  const res = await request(app).get(`/api/products/${productId}`);
  return res.body.product.stock;
}

before(async () => {
  await pool.query(
    'TRUNCATE users, categories, products, orders, order_items, payments RESTART IDENTITY CASCADE'
  );
  await pool.query("INSERT INTO categories (name) VALUES ('Food & Coffee')");
});

after(async () => {
  await pool.end();
});

// ---------- Authentication ----------

test('health endpoint responds', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('register rejects a short password', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Short', email: 'short@example.com', password: '123' });
  assert.equal(res.status, 400);
});

test('public register cannot create an admin', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Sneaky', email: 'sneaky@example.com', password: PASSWORD, role: 'admin' });
  assert.equal(res.status, 400);
});

test('register a customer, two sellers and an admin', async () => {
  customer = await signup('Customer One', 'customer@example.com');
  seller = await signup('Seller One', 'seller@example.com', 'seller');
  otherSeller = await signup('Seller Two', 'seller2@example.com', 'seller');

  await signup('Admin', 'admin@example.com');
  await pool.query("UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'");
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: PASSWORD });
  assert.equal(login.status, 200);
  admin = { ...login.body.user, token: login.body.token };
  assert.equal(admin.role, 'admin');
});

test('duplicate email is rejected', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Copy', email: 'customer@example.com', password: PASSWORD });
  assert.equal(res.status, 409);
});

test('login with a wrong password fails', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer@example.com', password: 'WrongPassword1' });
  assert.equal(res.status, 401);
});

test('/me needs a valid token', async () => {
  const noToken = await request(app).get('/api/auth/me');
  assert.equal(noToken.status, 401);

  const withToken = await request(app).get('/api/auth/me').set(auth(customer));
  assert.equal(withToken.status, 200);
  assert.equal(withToken.body.user.email, 'customer@example.com');
});

// ---------- Products and roles ----------

test('a customer cannot create a product', async () => {
  const res = await request(app)
    .post('/api/products')
    .set(auth(customer))
    .send({ name: 'Not allowed', price: 10, stock: 1 });
  assert.equal(res.status, 403);
});

test('a seller creates a product', async () => {
  const res = await request(app)
    .post('/api/products')
    .set(auth(seller))
    .send({
      name: 'Ethiopian Coffee 1kg',
      description: 'Freshly roasted Yirgacheffe beans',
      price: 850,
      stock: 10,
      category_id: 1,
    });
  assert.equal(res.status, 201);
  productId = res.body.product.id;
  assert.equal(res.body.product.price, 850);
});

test('another seller cannot edit that product', async () => {
  const res = await request(app)
    .put(`/api/products/${productId}`)
    .set(auth(otherSeller))
    .send({ price: 1 });
  assert.equal(res.status, 403);
});

test('products can be searched without logging in', async () => {
  const res = await request(app).get('/api/products?search=coffee');
  assert.equal(res.status, 200);
  assert.equal(res.body.products.length, 1);
  assert.equal(res.body.products[0].category_name, 'Food & Coffee');
});

// ---------- Orders ----------

test('placing an order reduces stock and adds the shipping fee', async () => {
  const res = await placeOrder(customer, coffee(2));
  assert.equal(res.status, 201);
  assert.equal(res.body.order.shipping_fee, 80); // Addis Ababa, items under 2000 ETB
  assert.equal(res.body.order.total, 1780); // 2 x 850 + 80
  assert.equal(res.body.payment.method, 'simulated');
  order1Id = res.body.order.id;
  assert.equal(await stockOf(), 8);
});

test('an order without a valid address is rejected and changes nothing', async () => {
  const noAddress = await request(app)
    .post('/api/orders')
    .set(auth(customer))
    .send({ items: coffee(1), payment_method: 'online' });
  assert.equal(noAddress.status, 400);

  const badPhone = await placeOrder(customer, coffee(1), { shipping: { phone: '12345' } });
  assert.equal(badPhone.status, 400);

  const badRegion = await placeOrder(customer, coffee(1), { shipping: { region: 'Atlantis' } });
  assert.equal(badRegion.status, 400);

  assert.equal(await stockOf(), 8);
});

test('ordering more than the stock is rejected and changes nothing', async () => {
  const res = await placeOrder(customer, coffee(50));
  assert.equal(res.status, 409);
  assert.equal(await stockOf(), 8);
});

test('a seller cannot place orders', async () => {
  const res = await placeOrder(seller, coffee(1));
  assert.equal(res.status, 403);
});

test('the seller sees the order, other sellers do not', async () => {
  const mine = await request(app).get('/api/orders/seller').set(auth(seller));
  assert.equal(mine.status, 200);
  assert.equal(mine.body.orders.length, 1);

  const theirs = await request(app).get('/api/orders/seller').set(auth(otherSeller));
  assert.equal(theirs.body.orders.length, 0);
});

test('a customer cannot mark an order as shipped', async () => {
  const res = await request(app)
    .patch(`/api/orders/${order1Id}/status`)
    .set(auth(customer))
    .send({ status: 'shipped' });
  assert.equal(res.status, 403);
});

test('cancelling a pending order puts the stock back', async () => {
  const placed = await placeOrder(customer, coffee(3));
  assert.equal(placed.status, 201);
  assert.equal(await stockOf(), 5);

  const cancelled = await request(app)
    .patch(`/api/orders/${placed.body.order.id}/status`)
    .set(auth(customer))
    .send({ status: 'cancelled' });
  assert.equal(cancelled.status, 200);
  assert.equal(await stockOf(), 8);
});

test('a seller confirms an order; the customer can then no longer cancel it', async () => {
  const confirm = await request(app)
    .patch(`/api/orders/${order1Id}/status`)
    .set(auth(seller))
    .send({ status: 'confirmed' });
  assert.equal(confirm.status, 200);

  const cancel = await request(app)
    .patch(`/api/orders/${order1Id}/status`)
    .set(auth(customer))
    .send({ status: 'cancelled' });
  assert.equal(cancel.status, 409);
});

test('a seller without items in the order cannot update it', async () => {
  const res = await request(app)
    .patch(`/api/orders/${order1Id}/status`)
    .set(auth(otherSeller))
    .send({ status: 'shipped' });
  assert.equal(res.status, 404);
});

// ---------- Admin ----------

test('the sales report is admin only', async () => {
  const denied = await request(app).get('/api/admin/reports/sales').set(auth(customer));
  assert.equal(denied.status, 403);

  const ok = await request(app).get('/api/admin/reports/sales').set(auth(admin));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.totals.orders, 1); // the cancelled order is not counted
  assert.equal(ok.body.totals.revenue, 1780);
});

test('a disabled account is locked out immediately', async () => {
  const off = await request(app)
    .patch(`/api/admin/users/${otherSeller.id}`)
    .set(auth(admin))
    .send({ is_active: false });
  assert.equal(off.status, 200);

  const res = await request(app).get('/api/auth/me').set(auth(otherSeller));
  assert.equal(res.status, 401);
});

// ---------- Restocking, shipping fees and cash on delivery ----------

test('a seller can restock a product', async () => {
  const res = await request(app)
    .put(`/api/products/${productId}`)
    .set(auth(seller))
    .send({ stock: 50 });
  assert.equal(res.status, 200);
  assert.equal(await stockOf(), 50);
});

test('shipping is 80 ETB in Addis Ababa, 150 ETB elsewhere and free from 2000 ETB', async () => {
  const oromia = { region: 'Oromia', city: 'Adama' };

  const addis = await placeOrder(customer, coffee(1));
  assert.equal(addis.status, 201);
  assert.equal(addis.body.order.shipping_fee, 80);
  assert.equal(addis.body.order.total, 930);

  const elsewhere = await placeOrder(customer, coffee(1), { shipping: oromia });
  assert.equal(elsewhere.status, 201);
  assert.equal(elsewhere.body.order.shipping_fee, 150);
  assert.equal(elsewhere.body.order.total, 1000);

  const free = await placeOrder(customer, coffee(3), { shipping: oromia });
  assert.equal(free.status, 201);
  assert.equal(free.body.order.shipping_fee, 0); // 3 x 850 = 2550, over 2000
  assert.equal(free.body.order.total, 2550);
});

test('cash on delivery creates a pending order with a cod payment', async () => {
  const before = await stockOf();
  const res = await placeOrder(customer, coffee(1), { method: 'cod' });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.status, 'pending');
  assert.equal(res.body.payment.method, 'cod');
  assert.equal(await stockOf(), before - 1);

  const sellerView = await request(app).get('/api/orders/seller').set(auth(seller));
  assert.ok(sellerView.body.orders.some((o) => o.id === res.body.order.id));
});

// ---------- Real payments (Chapa is mocked, no network) ----------

function mockChapa(verifyStatus = 'success') {
  const realFetch = globalThis.fetch;
  process.env.PAYMENT_MODE = 'chapa';
  process.env.CHAPA_SECRET_KEY = 'test-key';
  let amount = 0;

  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    const json = (body) => new Response(JSON.stringify(body), { status: 200 });
    if (u.endsWith('/transaction/initialize')) {
      amount = JSON.parse(options.body).amount;
      return json({
        status: 'success',
        message: 'ok',
        data: { checkout_url: 'https://checkout.chapa.co/test-link' },
      });
    }
    if (u.includes('/transaction/verify/')) {
      return json({
        status: 'success',
        message: 'ok',
        data: { status: verifyStatus, amount, currency: 'ETB' },
      });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  };

  return () => {
    globalThis.fetch = realFetch;
    process.env.PAYMENT_MODE = 'simulated';
  };
}

test('with real payments on, an order waits for payment until it is verified', async () => {
  const restore = mockChapa('success');
  try {
    const before = await stockOf();
    const placed = await placeOrder(customer, coffee(1));
    assert.equal(placed.status, 201);
    assert.equal(placed.body.order.status, 'awaiting_payment');
    assert.equal(placed.body.order.total, 930);
    assert.equal(placed.body.payment.method, 'chapa');
    assert.ok(placed.body.payment.checkout_url);
    assert.equal(await stockOf(), before - 1);

    // sellers do not see unpaid orders
    const sellerView = await request(app).get('/api/orders/seller').set(auth(seller));
    assert.ok(!sellerView.body.orders.some((o) => o.id === placed.body.order.id));

    const verified = await request(app)
      .post('/api/payments/verify')
      .set(auth(customer))
      .send({ tx_ref: placed.body.payment.tx_ref });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.status, 'paid');

    const history = await request(app).get('/api/orders').set(auth(customer));
    const mine = history.body.orders.find((o) => o.id === placed.body.order.id);
    assert.equal(mine.status, 'pending');
    assert.equal(mine.payment.status, 'paid');
  } finally {
    restore();
  }
});

test('an unpaid order expires and its stock is returned', async () => {
  const restore = mockChapa('pending');
  try {
    const before = await stockOf();
    const placed = await placeOrder(customer, coffee(2));
    assert.equal(placed.status, 201);
    assert.equal(await stockOf(), before - 2);

    await pool.query("UPDATE orders SET created_at = NOW() - INTERVAL '2 hours' WHERE id = $1", [
      placed.body.order.id,
    ]);
    const cancelled = await expireUnpaidOrders(30);
    assert.equal(cancelled, 1);
    assert.equal(await stockOf(), before);

    const history = await request(app).get('/api/orders').set(auth(customer));
    const mine = history.body.orders.find((o) => o.id === placed.body.order.id);
    assert.equal(mine.status, 'cancelled');
    assert.equal(mine.payment.status, 'expired');
  } finally {
    restore();
  }
});

// ---------- Photo uploads ----------

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

test('only sellers can upload photos, and only real images are accepted', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { UPLOAD_DIR } = await import('../src/modules/uploads/uploads.routes.js');

  const noLogin = await request(app)
    .post('/api/uploads')
    .attach('image', TINY_PNG, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(noLogin.status, 401);

  const asCustomer = await request(app)
    .post('/api/uploads')
    .set(auth(customer))
    .attach('image', TINY_PNG, { filename: 'a.png', contentType: 'image/png' });
  assert.equal(asCustomer.status, 403);

  // A text file pretending to be a picture is rejected
  const fake = await request(app)
    .post('/api/uploads')
    .set(auth(seller))
    .attach('image', Buffer.from('this is not an image at all'), {
      filename: 'fake.png',
      contentType: 'image/png',
    });
  assert.equal(fake.status, 400);

  const ok = await request(app)
    .post('/api/uploads')
    .set(auth(seller))
    .attach('image', TINY_PNG, { filename: 'photo.png', contentType: 'image/png' });
  assert.equal(ok.status, 201);
  assert.match(ok.body.url, /^\/uploads\/[a-f0-9]{24}\.png$/);

  // The stored photo can be fetched back
  const served = await request(app).get(ok.body.url);
  assert.equal(served.status, 200);
  assert.match(served.headers['content-type'], /image\/png/);

  await fs.unlink(path.join(UPLOAD_DIR, path.basename(ok.body.url)));
});