// lib/syncpay.js
// Integração com a SyncPay — SOMENTE SERVIDOR

const BASE =
  process.env.SYNCPAY_BASE_URL ||
  'https://api.syncpayments.com.br';

let cachedToken = null;

// =====================================================
// UTILITÁRIOS
// =====================================================

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw_response: text,
    };
  }
}

function getErrorMessage(data, fallback = 'Erro desconhecido') {
  if (!data) return fallback;

  if (typeof data === 'string') {
    return data;
  }

  if (data.message) {
    return String(data.message);
  }

  if (data.error) {
    if (typeof data.error === 'string') {
      return data.error;
    }

    if (data.error.message) {
      return String(data.error.message);
    }
  }

  if (data.errors) {
    try {
      return JSON.stringify(data.errors);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

// =====================================================
// AUTH TOKEN
// =====================================================

export async function getToken() {
  const now = Date.now();

  // Reutiliza o token enquanto ainda estiver válido.
  if (
    cachedToken &&
    cachedToken.exp > now + 60_000
  ) {
    return cachedToken.access_token;
  }

  const client_id =
    process.env.SYNCPAY_CLIENT_ID;

  const client_secret =
    process.env.SYNCPAY_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error(
      'SYNCPAY_CLIENT_ID ou SYNCPAY_CLIENT_SECRET não configurados na Vercel.'
    );
  }

  console.log(
    '[SyncPay Auth] Solicitando token...'
  );

  const response = await fetch(
    `${BASE}/api/partner/v1/auth-token`,
    {
      method: 'POST',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        client_id,
        client_secret,
      }),
    }
  );

  const data =
    await parseResponse(response);

  if (
    !response.ok ||
    !data.access_token
  ) {
    console.error(
      '[SyncPay Auth] Erro:',
      response.status,
      data
    );

    throw new Error(
      `SyncPay Auth ${response.status}: ${getErrorMessage(
        data,
        'Token não recebido.'
      )}`
    );
  }

  const expiresIn =
    Number(data.expires_in || 3600);

  cachedToken = {
    access_token: data.access_token,
    exp: now + expiresIn * 1000,
  };

  console.log(
    '[SyncPay Auth] Token obtido com sucesso.'
  );

  return cachedToken.access_token;
}

// =====================================================
// PIX CASH-IN
// =====================================================

export async function createCashIn({
  amount,
  description,
  webhook_url,
  client,
}) {
  const token =
    await getToken();

  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      'Valor do Pix inválido.'
    );
  }

  if (!webhook_url) {
    throw new Error(
      'Webhook URL não foi definida.'
    );
  }

  const body = {
    amount: numericAmount,

    description:
      description || 'Produto',

    webhook_url,

    client: {
      name: String(client?.name || '').trim(),
      email: String(client?.email || '').trim(),
    },
  };

  console.log(
    '[SyncPay CashIn] Enviando cobrança:',
    {
      amount: body.amount,
      description: body.description,
      webhook_url: body.webhook_url,
      client: {
        name: body.client.name,
        email: body.client.email,
      },
    }
  );

  const response = await fetch(
    `${BASE}/api/partner/v1/cash-in`,
    {
      method: 'POST',

      headers: {
        Accept: 'application/json',

        Authorization:
          `Bearer ${token}`,

        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify(body),
    }
  );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    console.error(
      '[SyncPay CashIn] Erro:',
      response.status,
      data
    );

    throw new Error(
      `SyncPay CashIn ${response.status}: ${getErrorMessage(
        data,
        JSON.stringify(data)
      )}`
    );
  }

  console.log(
    '[SyncPay CashIn] Resposta:',
    {
      status: response.status,
      hasPixCode: Boolean(data.pix_code),
      hasIdentifier: Boolean(data.identifier),
    }
  );

  if (
    !data.pix_code ||
    !data.identifier
  ) {
    console.error(
      '[SyncPay CashIn] Resposta inesperada:',
      data
    );

    throw new Error(
      `SyncPay não retornou pix_code ou identifier. Resposta: ${JSON.stringify(
        data
      )}`
    );
  }

  return {
    pix_code:
      data.pix_code,

    identifier:
      data.identifier,

    raw:
      data,
  };
}

// =====================================================
// CONSULTA TRANSAÇÃO
// =====================================================

export async function getTransaction(
  identifier
) {
  if (!identifier) {
    throw new Error(
      'Identifier da transação não informado.'
    );
  }

  const token =
    await getToken();

  const response =
    await fetch(
      `${BASE}/api/partner/v1/transaction/${encodeURIComponent(
        identifier
      )}`,
      {
        method: 'GET',

        headers: {
          Authorization:
            `Bearer ${token}`,

          Accept:
            'application/json',
        },
      }
    );

  const data =
    await parseResponse(response);

  if (!response.ok) {
    console.error(
      '[SyncPay Transaction] Erro:',
      response.status,
      data
    );

    throw new Error(
      `SyncPay Transaction ${response.status}: ${getErrorMessage(
        data,
        JSON.stringify(data)
      )}`
    );
  }

  return data.data || data;
}