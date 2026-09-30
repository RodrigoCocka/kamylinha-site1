// api/create-pix.js
// Cria uma cobrança Pix através da SyncPay

import QRCode from 'qrcode';

import {
  createCashIn,
} from '../lib/syncpay.js';

import {
  PLANS,
} from '../lib/plans.js';

import {
  saveOrder,
} from '../lib/orders.js';

export default async function handler(
  req,
  res
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({
        error:
          'Method not allowed',
      });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    const {
      planId,
      name,
      email,
    } = body;

    // =====================================================
    // PLANO
    // =====================================================

    const plan =
      PLANS[planId];

    if (!plan) {
      return res
        .status(400)
        .json({
          error:
            'Plano inválido.',
        });
    }

    // =====================================================
    // CLIENTE
    // =====================================================

    const cleanName =
      String(name || '').trim();

    const cleanEmail =
      String(email || '').trim();

    if (
      cleanName.length < 3
    ) {
      return res
        .status(400)
        .json({
          error:
            'Informe seu nome completo.',
        });
    }

    if (
      !cleanEmail ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
        cleanEmail
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'Informe um e-mail válido.',
        });
    }

    // =====================================================
    // WEBHOOK
    // =====================================================

    const proto =
      String(
        req.headers['x-forwarded-proto'] ||
          'https'
      ).split(',')[0];

    const host =
      req.headers['x-forwarded-host'] ||
      req.headers.host;

    if (!host) {
      throw new Error(
        'Não foi possível determinar o domínio do site.'
      );
    }

    const webhook_url =
      `${proto}://${host}/api/syncpay-webhook`;

    console.log(
      '[create-pix] Criando Pix:',
      {
        planId,
        amount: plan.price,
        webhook_url,
      }
    );

    // =====================================================
    // CRIA PIX NA SYNCPAY
    // =====================================================

    const result =
      await createCashIn({
        amount:
          plan.price,

        description:
          plan.name,

        webhook_url,

        client: {
          name:
            cleanName,

          email:
            cleanEmail,

        },
      });

    const {
      pix_code,
      identifier,
    } = result;

    // =====================================================
    // SALVA PEDIDO
    // =====================================================

    const now =
      new Date().toISOString();

    try {
      await saveOrder({
        identifier,

        order_id:
          `ped_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,

        plan_id:
          planId,

        plan_name:
          plan.name,

        amount:
          plan.price,

        status:
          'pending',

        customer: {
          name:
            cleanName,

          email:
            cleanEmail,

        },

        created_at:
          now,

        updated_at:
          now,
      });
    } catch (orderError) {
      // O Pix já foi criado. Não vamos destruir
      // a venda só porque a persistência falhou.
      console.error(
        '[create-pix] Erro ao salvar pedido:',
        orderError?.message ||
          orderError
      );
    }

    // =====================================================
    // QR CODE
    // =====================================================

    const qr_code_base64 =
      await QRCode.toDataURL(
        pix_code,
        {
          margin: 1,
          width: 320,
          errorCorrectionLevel: 'M',
        }
      );

    // =====================================================
    // RESPOSTA
    // =====================================================

    return res
      .status(200)
      .json({
        identifier,

        pix_code,

        qr_code_base64,

        amount:
          plan.price,

        plan_name:
          plan.name,

        expires_in:
          900,
      });

  } catch (error) {
    console.error(
      '========================================'
    );

    console.error(
      '[create-pix] ERRO:',
      error
    );

    console.error(
      '========================================'
    );

    return res
      .status(500)
      .json({
        error:
          error?.message ||
          'Não foi possível gerar o pagamento.',

        // Ajuda a identificar erros no servidor
        // durante o desenvolvimento.
        type:
          error?.name ||
          'Error',
      });
  }
}