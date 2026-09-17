// Rate limiting por IP para os endpoints da IA (Upstash Redis).
// Serverless não compartilha memória entre invocações, por isso o limite precisa
// viver num store externo. Usa as env vars do Vercel KV (KV_REST_API_*) ou as do
// Upstash direto (UPSTASH_REDIS_REST_*).
//
// Fail-open: se o Redis não estiver configurado (dev/preview local), não bloqueia —
// o rate limit é proteção de custo em produção, não deve travar o desenvolvimento.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis;
const limiters = {};

const getRedis = () => {
  if (redis !== undefined) return redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
};

const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
};

// Retorna { ok }. Quando !ok, também traz retryAfter (segundos) para o header.
export const checkRateLimit = async (req, { name, limit, windowSec }) => {
  const client = getRedis();
  if (!client) return { ok: true, skipped: true };

  if (!limiters[name]) {
    limiters[name] = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `rl:${name}`,
      analytics: false,
    });
  }

  try {
    const { success, reset } = await limiters[name].limit(getClientIp(req));
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return { ok: success, retryAfter };
  } catch (err) {
    // Se o Redis falhar, não derruba o endpoint — loga e libera.
    console.error(`[ratelimit:${name}] erro no Redis, liberando request:`, err.message);
    return { ok: true, skipped: true };
  }
};
