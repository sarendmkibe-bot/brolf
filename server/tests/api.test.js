import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Tests use their own database so your real data is never touched
process.env.DB_NAME = 'markethub_test';

const { default: app } = await import('../src/app.js');
const { default: pool } = await import('../src/config/db.js');

const PASSWORD = 'Password123';
const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

async function signup(name, email, role = 'customer') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: PASSWORD, role });
  assert.equal(res.status, 201);
  return { ...res.body.user, token: res.body.token };
}

let customer, seller, otherSeller, admin;
let productId, order1Id;

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

test('placing an order reduces stock and records a simulated payment', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set(auth(customer))
    .send({ items: [{ product_id: productId, quantity: 2 }] });
  assert.equal(res.status, 201);
  assert.equal(res.body.order.total, 1700);
  assert.equal(res.body.payment.method, 'simulated');
  order1Id = res.body.order.id;
  assert.equal(await stockOf(), 8);
});

test('ordering more than the stock is rejected and changes nothing', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set(auth(customer))
    .send({ items: [{ product_id: productId, quantity: 50 }] });
  assert.equal(res.status, 409);
  assert.equal(await stockOf(), 8);
});

test('a seller cannot place orders', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set(auth(seller))
    .send({ items: [{ product_id: productId, quantity: 1 }] });
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
  const placed = await request(app)
    .post('/api/orders')
    .set(auth(customer))
    .send({ items: [{ product_id: productId, quantity: 3 }] });
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
  assert.equal(ok.body.totals.revenue, 1700);
});