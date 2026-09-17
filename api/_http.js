// Helpers HTTP compartilhados pelos endpoints da IA.
//
// CORS por allowlist é defense-in-depth: impede que o JS de *outros sites* embuta
// a MarIA no navegador. NÃO protege contra curl/scripts — o controle de custo real
// é o rate limit (api/_ratelimit.js).
//
// Configure ALLOWED_ORIGINS como lista separada por vírgula, ex:
//   ALLOWED_ORIGINS="https://hunters.com.br,https://www.hunters.com.br"
// Se não configurado, cai para '*' (mantém tudo funcionando; sem a camada extra).

const parseAllowed = () =>
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const applyCors = (req, res) => {
  const allowed = parseAllowed();
  const origin = req.headers.origin;

  if (allowed.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Reflete a origem se permitida; senão devolve a primeira da lista
    // (o navegador bloqueia a resposta para origens não listadas).
    res.setHeader('Access-Control-Allow-Origin', allowed.includes(origin) ? origin : allowed[0]);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};
