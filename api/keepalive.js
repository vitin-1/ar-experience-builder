// Vercel Cron — mantém o projeto Supabase free ativo (pausa após ~7 dias sem atividade).
// Agendado em vercel.json. O SELECT trivial conta como atividade no Postgres e reseta o timer.
// Roda no deploy da Vercel, então não depende de atividade no repo (ao contrário do cron do GitHub).
const SUPABASE_URL = 'https://wdckyjojtcekwxlhktjt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vfC3JSYceyCpRGKfPWqyjA_4C8N-cUu';

export default async function handler(req, res) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ar_targets?select=id&limit=1&active=eq.true`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) throw new Error(`Supabase retornou ${r.status}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[keepalive] ping falhou:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
