// Vercel Serverless Function — gera token efêmero para a OpenAI Realtime API
// A OPENAI_API_KEY deve ser configurada nas variáveis de ambiente da Vercel, nunca no código.
import { MARIA_INSTRUCTIONS } from './_shared.js';
import { applyCors } from './_http.js';
import { checkRateLimit } from './_ratelimit.js';

const MODEL = 'gpt-realtime';

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Produto mais caro da OpenAI: limite apertado por IP.
  const rl = await checkRateLimit(req, { name: 'realtime', limit: 5, windowSec: 60 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Muitas sessões em pouco tempo. Aguarde um instante.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[realtime-session] OPENAI_API_KEY não configurada');
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor' });
  }

  try {
    const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: MODEL,
          instructions: MARIA_INSTRUCTIONS,
          output_modalities: ['audio'],
          audio: {
            output: { voice: 'marin' },
            input: { transcription: { model: 'gpt-4o-transcribe' } },
          },
        },
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      console.error('[realtime-session] Erro da OpenAI:', r.status, err);
      return res.status(r.status).json(err);
    }

    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[realtime-session] Exceção:', err);
    return res.status(500).json({ error: err.message });
  }
}
