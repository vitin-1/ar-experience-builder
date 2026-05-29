---
name: chat-ai-n8n
description: Use esta skill quando formos mexer no chat da landing page (index.html), envio de áudio/voz, conexões com o webhook do n8n ou na interface do waveform.
---

# Integração do Chat de IA (index.html)
Regras para manipulação do sistema de chat e mensageria:
1. **Mensagens de Texto:** Devem fazer um POST JSON contendo `{ message, sessionId }` para o webhook.
2. **Mensagens de Voz:** Enviam um `FormData` contendo o blob `audio.webm` e o `sessionId`.
3. **Webhook URL:** A URL do n8n está hardcoded inline: `https://n8n-n8n.ooqqkc.easypanel.host/webhook/...`
4. **Interface Visual:** O efeito de onda sonora (waveform) consome amostras reais de volume usando a API `AnalyserNode` do navegador durante a gravação.
