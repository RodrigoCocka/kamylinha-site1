// lib/orders.js — persistência dos pedidos.
// Usa Upstash/Vercel KV via REST quando as variáveis existem; senão memória (só p/ dev).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = new Map();
const TTL = 60 * 60 * 24 * 7; // 7 dias

async function kv(command) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  return (await res.json()).result;
}

export async function saveOrder(order) {
  if (URL_ && TOKEN) {
    await kv(['SET', `order:${order.identifier}`, JSON.stringify(order), 'EX', String(TTL)]);
  } else {
    mem.set(order.identifier, order);
  }
  return order;
}

export async function getOrder(identifier) {
  if (URL_ && TOKEN) {
    const raw = await kv(['GET', `order:${identifier}`]);
    return raw ? JSON.parse(raw) : null;
  }
  return mem.get(identifier) || null;
}

export async function updateOrder(identifier, patch) {
  const current = (await getOrder(identifier)) || { identifier };
  const next = { ...current, ...patch, updated_at: new Date().toISOString() };
  await saveOrder(next);
  return next;
}
