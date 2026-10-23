# MarketHub

A multi-vendor online marketplace built for the Brolf Tech Remote Internship Challenge 2026
(Project 2: Smart E-Commerce Platform, Full Stack track).

Customers browse and buy products, sellers manage their own products and stock, and
administrators oversee users, orders and sales.

## Tech stack

- Backend: Node.js, Express 5, PostgreSQL (`pg`), Zod, bcrypt, JSON Web Tokens, Helmet
- Frontend: React, Vite, Tailwind CSS (in progress)

## Requirements

Node.js 20+, npm, Git and PostgreSQL 16+.

## Run the backend locally

```bash
git clone https://github.com/sarendmkibe-bot/brolf.git
cd brolf/server
npm install
```

Create the database:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE markethub;"
```

Copy `server/.env.example` to `server/.env` and fill in your own values:
database password and a random `JWT_SECRET`. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create the tables, add starter categories, and start the server:

```bash
npm run migrate
npm run seed
npm run dev
```

The API runs on http://localhost:5000. Check it at `/api/health` and `/api/health/db`.

## Tests

Tests use a separate database so real data is never touched:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE markethub_test;"
DB_NAME=markethub_test npm run migrate    # PowerShell: $env:DB_NAME="markethub_test"; npm run migrate
npm test
```

## Documentation

- API reference: [docs/api.md](docs/api.md)
- Database schema: [docs/database-schema.md](docs/database-schema.md)

## Roles

- **customer**: browse, place orders, view order history, cancel pending orders
- **seller**: manage own products and stock, view and update orders containing their products
- **admin**: manage users, view all orders, view sales reports. Admins cannot be created
  through public sign-up; promote an account in the database.

## Known limitations

- Payments are simulated records only. No real payment provider is connected and no card data is stored.
- The shopping cart lives in the browser until checkout.
- Product images are stored as URLs; there is no file upload yet.