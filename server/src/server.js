import 'dotenv/config';
import app from './app.js';
import { paymentMode } from './modules/payments/chapa.js';
import { expireUnpaidOrders } from './modules/payments/service.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`MarketHub API running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error(`Could not start on port ${PORT}:`, err.message);
  process.exit(1);
});

// With real payments on, cancel orders that were never paid and return their stock
if (paymentMode() === 'chapa') {
  setInterval(() => expireUnpaidOrders(30).catch(console.error), 5 * 60 * 1000);
}