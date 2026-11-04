import pool from '../../config/db.js';
import { verifyPayment } from './chapa.js';

export const sameAmount = (a, b) => Math.abs(Number(a) - Number(b)) < 0.005;

// Mark a payment paid and move its order from "awaiting_payment" to "pending".
// If the order was already cancelled (for example it expired), the money must be refunded.
export async function markPaid(paymentId, orderId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = (
      await client.query('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [orderId])
    ).rows[0];

    let result = 'paid';
    if (order.status === 'awaiting_payment') {
      await client.query("UPDATE orders SET status = 'pending' WHERE id = $1", [orderId]);
    } else if (order.status === 'cancelled') {
      result = 'refund_due';
    }

    await client.query('UPDATE payments SET status = $2, paid_at = NOW() WHERE id = $1', [
      paymentId,
      result,
    ]);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Cancel an unpaid order and put its items back in stock
export async function cancelAwaitingOrder(orderId, paymentStatus = 'failed') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = $1 AND status = 'awaiting_payment' RETURNING id",
      [orderId]
    );
    if (res.rowCount) {
      await client.query(
        `UPDATE products SET stock = products.stock + oi.quantity
         FROM order_items oi
         WHERE oi.order_id = $1 AND products.id = oi.product_id`,
        [orderId]
      );
      await client.query(
        "UPDATE payments SET status = $2 WHERE order_id = $1 AND status = 'pending'",
        [orderId, paymentStatus]
      );
    }
    await client.query('COMMIT');
    return res.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Orders still unpaid after N minutes are cancelled and their stock returned.
// Chapa is asked first, so a customer who paid but closed the tab is not cancelled.
export async function expireUnpaidOrders(minutes = 30) {
  const old = await pool.query(
    `SELECT o.id AS order_id, p.id AS payment_id, p.tx_ref, p.amount::float8 AS amount
     FROM orders o JOIN payments p ON p.order_id = o.id
     WHERE o.status = 'awaiting_payment' AND p.method = 'chapa'
       AND o.created_at < NOW() - make_interval(mins => $1::int)`,
    [minutes]
  );

  let cancelled = 0;
  for (const row of old.rows) {
    try {
      const result = await verifyPayment(row.tx_ref);
      if (result.status === 'success') {
        if (sameAmount(result.amount, row.amount)) {
          await markPaid(row.payment_id, row.order_id);
        } else {
          console.error('Amount mismatch, needs manual review:', row.tx_ref);
        }
        continue;
      }
    } catch (err) {
      if (!err.fromProvider) {
        console.error('Could not reach Chapa, will retry:', err.message);
        continue; // network trouble: do not cancel something that may be paid
      }
      // Chapa answered "not found" or an error: the customer never paid
    }
    if (await cancelAwaitingOrder(row.order_id, 'expired')) cancelled++;
  }
  return cancelled;
}