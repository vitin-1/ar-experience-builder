---
name: pipeline-ar-8thwall
description: Use esta skill sempre que eu pedir para mexer na câmera, detecção de imagens, renderização 3D, lógica do Three.js, zoom ou performance da página ar.html.
---

# Lógica de Realidade Aumentada (ar.html)
Ao editar o pipeline de AR, siga estas diretrizes e regras técnicas:
1. **Engine:** Usamos 8th Wall XR Engine (`/xr/xr.js`, self-hosted) integrada com Three.js para renderizar as texturas de vídeo.
2. **Fluxo:** O arquivo busca alvos ativos do banco via `loadTargetsFromDB()`. Se falhar, usa os alvos hardcoded de fallback.
3. **Renderização:** Os vídeos são renderizados em malhas geradas por `createRoundedGeometry()`.
4. **Interação:** O pinch-to-zoom usa a variável `userScaleMultiplier` aplicada à escala da malha no evento `reality.imageupdated`.
5. **Performance:** Dispositivos fracos recebem a classe `.perf-low` no `<body>` (baseado em hardwareConcurrency e deviceMemory) para desativar filtros pesados.
