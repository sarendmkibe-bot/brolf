# MarketHub API

Base URL: `http://localhost:5000/api`. All bodies are JSON.
Protected routes need the header `Authorization: Bearer <token>`.

Errors look like `{ "error": "message" }`. Common status codes: 400 invalid input,
401 not logged in, 403 not allowed, 404 not found, 409 conflict.

## Auth

| Method | Path | Access | Body | Returns |
|---|---|---|---|---|
| POST | /auth/register | public | `name`, `email`, `password` (8+ chars), `role` (`customer` or `seller`) | `{ user, token }` |
| POST | /auth/login | public | `email`, `password` | `{ user, token }` |
| GET | /auth/me | any user | none | `{ user }` |

## Categories

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | /categories | public | `{ categories: [{ id, name }] }` |
| POST | /categories | admin | body: `name` |

## Products

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | /products | public | query: `search`, `category`, `minPrice`, `maxPrice`, `page`, `limit`; returns `{ products, page, limit, total }` |
| GET | /products/:id | public | `{ product }` |
| GET | /products/mine | seller, admin | own products including inactive ones |
| POST | /products | seller, admin | `name`, `price`, `stock` required; `description`, `category_id`, `image_url` optional |
| PUT | /products/:id | owner, admin | any product field plus `is_active` |
| DELETE | /products/:id | owner, admin | deactivates the product (kept for old orders) |

## Orders

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | /orders | customer | body: `{ items: [{ product_id, quantity }] }`; checks stock in a transaction; creates a simulated payment record |
| GET | /orders | customer | own order history with items |
| GET | /orders/seller | seller | orders containing the seller's products |
| PATCH | /orders/:id/status | customer, seller, admin | body: `{ status }`; customers can only cancel pending orders; sellers update orders containing their products |

Status flow: `pending` → `confirmed` → `shipped` → `delivered`.
`pending` and `confirmed` orders can be `cancelled`, which returns items to stock.

## Admin (admin only)

| Method | Path | Notes |
|---|---|---|
| GET | /admin/users | list users |
| PATCH | /admin/users/:id | body: `{ is_active: true/false }` |
| GET | /admin/orders | all orders |
| GET | /admin/reports/sales | `{ totals, orders_by_status, top_products }`; cancelled orders are not counted |