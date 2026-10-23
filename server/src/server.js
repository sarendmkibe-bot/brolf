import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`MarketHub API running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error(`Could not start on port ${PORT}:`, err.message);
  process.exit(1);
});