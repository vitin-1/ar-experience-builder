// Vercel Serverless Function — chat de texto com a MarIA (Chat Completions)
import { MARIA_INSTRUCTIONS } from './_shared.js';
import { applyCors } from './_http.js';
import { checkRateLimit } from './_ratelimit.js';

const MAX_HISTORY = 20;      // janela deslizante: últimas N mensagens enviadas à OpenAI
const REQUEST_TIMEOUT = 30000; // ms — evita "digitando..." infinito se a OpenAI travar

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = await checkRateLimit(req, { name: 'chat', limit: 20, windowSec: 60 });
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Muitas mensagens em pouco tempo. Aguarde um instante.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor' });

  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Só aceita user/assistant do cliente — impede injeção de role 'system' que
  // sobrescreveria a personalidade/regras da MarIA. E aplica janela de histórico.
  const safeMessages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY);

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'no valid messages' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MARIA_INSTRUCTIONS },
          ...safeMessages,
        ],
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      // Loga o detalhe no servidor, devolve mensagem genérica ao cliente.
      const err = await r.json().catch(() => ({ error: r.statusText }));
      console.error('[chat] Erro da OpenAI:', r.status, err);
      return res.status(502).json({ error: 'Não foi possível obter resposta da IA.' });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error('[chat] Resposta da OpenAI sem conteúdo:', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'Resposta inválida da IA.' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[chat] Timeout na chamada à OpenAI');
      return res.status(504).json({ error: 'A IA demorou para responder. Tente novamente.' });
    }
    console.error('[chat] Exceção:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  } finally {
    clearTimeout(timeout);
  }
}
