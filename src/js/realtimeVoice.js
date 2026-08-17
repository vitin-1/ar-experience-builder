// OpenAI Realtime API — voz-a-voz via WebRTC

const REALTIME_MODEL = 'gpt-4o-realtime-preview';

// === DOM ===
const chatModal    = document.getElementById('ai-chat-modal');
const chatMessages = document.getElementById('chat-messages');
const headerSub    = document.getElementById('chat-header-sub');
const mainInputBar = document.querySelector('.ai-interaction-wrapper');
const chatMicBtn   = document.getElementById('chat-mic-btn');
const mainMicBtn   = document.querySelector('.ai-mic-btn');
const closeChat    = document.getElementById('close-chat');
const btnUnlock    = document.getElementById('btn-unlock');
const app          = document.getElementById('app');

// === STATE ===
let pc             = null;
let dc             = null;
let localStream    = null;
let audioEl        = null;
let connected      = false;
let aiMsgEl        = null;   // elemento DOM da bolha de transcrição atual da IA
let aiTranscript   = '';     // buffer do transcript streaming

// === HELPERS ===
const getTimeNow = () => {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const setStatus = (text) => {
  if (headerSub) headerSub.textContent = text;
};

const openChat = () => {
  chatModal?.classList.remove('hidden');
  if (mainInputBar) mainInputBar.style.display = 'none';
};

// Cria bolha de texto no chat e devolve o elemento <div class="chat-msg">
const appendBubble = (text, sender) => {
  const group = document.createElement('div');
  const isAI = sender.startsWith('ai');
  if (isAI) {
    group.className = 'chat-msg-group ai-group';
    group.innerHTML = `
      <div class="msg-avatar"><img src="/Logo_hunters.png.png" alt="H" onerror="this.textContent='H'"></div>
      <div class="msg-content">
        <div class="chat-msg ${sender}">${text}</div>
        <span class="msg-time">${getTimeNow()}</span>
      </div>`;
  } else {
    group.className = 'chat-msg-group user-group';
    group.innerHTML = `
      <div class="msg-content">
        <div class="chat-msg ${sender}">${text}</div>
        <span class="msg-time">${getTimeNow()}</span>
      </div>`;
  }
  chatMessages.appendChild(group);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return group.querySelector('.chat-msg');
};

// === EVENTOS DO DATA CHANNEL ===
const handleEvent = (e) => {
  let event;
  try { event = JSON.parse(e.data); } catch { return; }

  switch (event.type) {

    // Usuário começou a falar
    case 'input_audio_buffer.speech_started':
      setStatus('Ouvindo...');
      // Interrompe qualquer áudio da IA que esteja tocando
      if (audioEl) { try { audioEl.srcObject = null; } catch (_) {} }
      break;

    // Usuário parou de falar
    case 'input_audio_buffer.speech_stopped':
      setStatus('Processando...');
      break;

    // Transcrição da fala do usuário completa
    case 'conversation.item.input_audio_transcription.completed': {
      const userText = event.transcript?.trim();
      if (userText) {
        openChat();
        appendBubble(userText, 'user');
      }
      break;
    }

    // IA começa a responder — abre a bolha de transcrição
    case 'response.created':
      openChat();
      aiTranscript = '';
      aiMsgEl = appendBubble('', 'ai');
      setStatus('Falando...');
      break;

    // Transcript da IA chegando em pedaços (streaming)
    case 'response.audio_transcript.delta':
      aiTranscript += event.delta || '';
      if (aiMsgEl) {
        aiMsgEl.textContent = aiTranscript;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      break;

    // Transcript da IA completo
    case 'response.audio_transcript.done':
      aiTranscript = '';
      aiMsgEl = null;
      setStatus('Conectado • Realtime');
      break;

    // Resposta completa
    case 'response.done':
      setStatus('Conectado • Realtime');
      break;
  }
};

// === DESCONECTAR ===
const disconnect = () => {
  if (dc)          { try { dc.close(); }          catch (_) {} dc = null; }
  if (pc)          { try { pc.close(); }          catch (_) {} pc = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (audioEl)     { audioEl.srcObject = null; audioEl.remove(); audioEl = null; }
  connected = false;
  chatMicBtn?.classList.remove('listening');
  mainMicBtn?.classList.remove('listening');
  setStatus('Online • IA');
};

// === CONECTAR ===
const connect = async () => {
  try {
    setStatus('Conectando...');
    chatMicBtn?.classList.add('listening');
    mainMicBtn?.classList.add('listening');
    openChat();

    // 1. Token efêmero via nosso backend (nunca expõe a API key no frontend)
    const sessionRes = await fetch('/api/realtime-session', { method: 'POST' });
    if (!sessionRes.ok) throw new Error(`Sessão falhou: ${sessionRes.status}`);
    const sessionData = await sessionRes.json();
    const token = sessionData.client_secret?.value;
    if (!token) throw new Error('Token não retornado pelo servidor');

    // 2. PeerConnection
    pc = new RTCPeerConnection();

    // 3. Elemento de áudio para a voz da IA
    audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

    // 4. Microfone do usuário
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    // 5. Data channel para eventos (transcrição, status)
    dc = pc.createDataChannel('oai-events');
    dc.onmessage = handleEvent;
    dc.onerror   = (err) => console.error('[RealtimeVoice] DataChannel erro:', err);

    // 6. Oferta SDP
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 7. Troca de SDP com a OpenAI
    const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!sdpRes.ok) throw new Error(`SDP exchange falhou: ${sdpRes.status}`);
    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    connected = true;
    setStatus('Conectado • Realtime');

  } catch (err) {
    console.error('[RealtimeVoice] Erro ao conectar:', err);
    disconnect();
    openChat();
    appendBubble('Não foi possível conectar à IA de voz. Verifique o microfone e tente novamente.', 'ai error');
  }
};

// === TOGGLE ===
const toggle = () => { connected ? disconnect() : connect(); };

// === LISTENERS ===
chatMicBtn?.addEventListener('click', toggle);
mainMicBtn?.addEventListener('click', toggle);

closeChat?.addEventListener('click', () => {
  disconnect();
  chatModal?.classList.add('hidden');
  if (mainInputBar) mainInputBar.style.display = '';
});

// Desconecta antes de navegar para o AR
btnUnlock?.addEventListener('click', (e) => {
  e.preventDefault();
  disconnect();
  app?.classList.add('dive-out');
  setTimeout(() => { window.location.href = btnUnlock.getAttribute('href'); }, 700);
});

// Desconecta ao minimizar / trocar de aba
document.addEventListener('visibilitychange', () => {
  if (document.hidden && connected) disconnect();
});
