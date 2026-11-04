import { Router } from 'express';
import { z } from 'zod';
import pool from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { verifyPayment } from './chapa.js';
import { markPaid, sameAmount } from './service.js';

const router = Router();

const verifySchema = z.object({ tx_ref: z.string().trim().min(5).max(100) });

// The customer comes back from Chapa (or presses "Check payment"): confirm with Chapa itself
router.post('/verify', requireAuth, requireRole('customer'), async (req, res, next) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const txRef = parsed.data.tx_ref;

  try {
    const found = await pool.query(
      `SELECT p.id, p.status, p.amount::float8 AS amount, p.order_id
       FROM payments p JOIN orders o ON o.id = p.order_id
       WHERE p.tx_ref = $1 AND o.customer_id = $2`,
      [txRef, req.user.id]
    );
    const payment = found.rows[0];
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (['paid', 'refund_due'].includes(payment.status)) {
      return res.json({ status: payment.status, order_id: payment.order_id });
    }

    let result;
    try {
      result = await verifyPayment(txRef);
    } catch (err) {
      console.error(err);
      if (err.fromProvider) {
        return res.json({ status: 'pending', order_id: payment.order_id });
      }
      return res
        .status(502)
        .json({ error: 'Could not confirm the payment yet. Try again in a moment.' });
    }

    if (result.status !== 'success') {
      return res.json({
        status: result.status === 'failed' ? 'failed' : 'pending',
        order_id: payment.order_id,
      });
    }
    if (!sameAmount(result.amount, payment.amount) || result.currency !== 'ETB') {
      console.error('Payment amount mismatch for', txRef);
      return res.status(409).json({ error: 'Payment amount does not match the order' });
    }

    const status = await markPaid(payment.id, payment.order_id);
    res.json({ status, order_id: payment.order_id });
  } catch (err) {
    next(err);
  }
});

export default router;