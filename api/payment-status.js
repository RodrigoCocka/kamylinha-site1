// api/payment-status.js — consulta o status no servidor (webhook + consulta oficial SyncPay)
import { getTransaction } from '../lib/syncpay.js';
import { getOrder, updateOrder } from '../lib/orders.js';
import { accessUrlFor } from '../lib/plans.js';

const PAID = new Set(['completed', 'paid', 'approved']);
const FAILED = new Set(['failed', 'refunded']);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const identifier = req.query?.identifier;
  if (!identifier) return res.status(400).json({ error: 'identifier obrigatório' });

  try {
    const order = await getOrder(identifier);

    // Se o webhook já confirmou, responde direto (sem chamada extra à SyncPay).
    if (order && order.status === 'paid') {
      return res.status(200).json({ status: 'paid', access_url: order.access_url || accessUrlFor(order.plan_id || '') });
    }

    const tx = await getTransaction(identifier);
    const raw = String(tx?.status || 'pending').toLowerCase();

    if (PAID.has(raw)) {
      const updated = await updateOrder(identifier, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        access_url: order?.access_url || accessUrlFor(order?.plan_id || ''),
      });
      return res.status(200).json({ status: 'paid', access_url: updated.access_url });
    }
    if (FAILED.has(raw)) {
      await updateOrder(identifier, { status: 'failed' });
      return res.status(200).json({ status: 'failed' });
    }
    return res.status(200).json({ status: 'pending' });
  } catch (err) {
    console.error('[payment-status]', err?.message);
    return res.status(200).json({ status: 'unknown' });
  }
}

