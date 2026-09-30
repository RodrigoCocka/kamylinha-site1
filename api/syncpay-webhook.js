// api/syncpay-webhook.js
// Recebe os webhooks da SyncPay e atualiza o pedido.

import { getOrder, updateOrder } from '../lib/orders.js';
import { accessUrlFor } from '../lib/plans.js';

const PAID = new Set([
  'completed',
  'paid',
  'approved',
]);

const FAILED = new Set([
  'failed',
  'refunded',
  'canceled',
  'cancelled',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  // Proteção opcional por token secreto.
  const expected = process.env.SYNCPAY_WEBHOOK_SECRET;

  if (expected && req.query?.token !== expected) {
    return res.status(401).json({
      error: 'unauthorized',
    });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    /*
     * A SyncPay pode enviar os dados diretamente
     * ou dentro de "data".
     */
    const data = body?.data || body;

    /*
     * Identificador da transação.
     *
     * Suportamos os formatos que aparecem
     * na documentação/respostas da SyncPay.
     */
    const identifier =
      data?.idTransaction ||
      data?.id ||
      data?.identifier ||
      data?.reference_id;

    /*
     * Status.
     *
     * A criação do CashIn usa "status_transaction",
     * enquanto a consulta usa "status".
     */
    const status = String(
      data?.status_transaction ||
      data?.status ||
      ''
    ).toLowerCase();

    if (!identifier || !status) {
      console.error(
        '[syncpay-webhook] Payload inválido:',
        JSON.stringify(body)
      );

      return res.status(400).json({
        error: 'payload inválido',
      });
    }

    const order = await getOrder(identifier);

    /*
     * Se não encontramos o pedido, não devemos
     * liberar nenhum conteúdo.
     */
    if (!order) {
      console.error(
        `[syncpay-webhook] Pedido não encontrado: ${identifier}`
      );

      return res.status(200).json({
        received: true,
      });
    }

    /*
     * PAGAMENTO CONFIRMADO
     */
    if (PAID.has(status)) {
      const accessUrl =
        order.access_url ||
        accessUrlFor(order.plan_id || '');

      await updateOrder(identifier, {
        status: 'paid',
        paid_at: order.paid_at || new Date().toISOString(),
        provider_status: status,
        provider_amount:
          data?.final_amount ??
          data?.amount ??
          null,
        access_url: accessUrl,
      });

      console.log(
        `[syncpay-webhook] Pagamento confirmado: ${identifier}`
      );
    }

    /*
     * PAGAMENTO FALHOU / FOI ESTORNADO
     */
    else if (FAILED.has(status)) {
      await updateOrder(identifier, {
        status: 'failed',
        provider_status: status,
      });

      console.log(
        `[syncpay-webhook] Pagamento falhou: ${identifier} (${status})`
      );
    }

    /*
     * PAGAMENTO AINDA PENDENTE
     */
    else {
      /*
       * Não sobrescrevemos um pagamento que já esteja
       * confirmado como "pending".
       */
      if (order.status !== 'paid') {
        await updateOrder(identifier, {
          status: 'pending',
          provider_status: status,
        });
      }
    }

    /*
     * A SyncPay exige resposta rápida.
     */
    return res.status(200).json({
      received: true,
    });

  } catch (err) {
    console.error(
      '[syncpay-webhook]',
      err?.message
    );

    /*
     * Mantemos 200 para evitar que a SyncPay fique
     * reenviando o mesmo webhook em loop.
     */
    return res.status(200).json({
      received: true,
    });
  }
}