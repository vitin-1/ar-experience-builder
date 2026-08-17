// OpenAI Realtime API — voz-a-voz via WebRTC

const REALTIME_MODEL = 'gpt-4o-realtime-preview';

// === DOM ===
const chatModal    = document.getElementById('ai-chat-modal');
const chatMessages = document.getElementById('chat-messages');
const headerSub    = document.getElementById('chat-header-sub');
const mainInputBar = document.querySelector('.ai-trigger-wrap');
const chatMicBtn   = document.getElementById('chat-mic-btn');
const mainMicBtn   = document.querySelector('.ai-mic-btn');
const closeChat    = document.getElementById('close-chat');
const btnUnlock    = document.getElementById('btn-unlock');
const orbHint      = document.getElementById('orb-hint');
const orbBtnLabel  = document.getElementById('orb-btn-label');
const app          = document.getElementById('app');

// === STATE ===
let pc             = null;
let dc             = null;
let localStream    = null;
let remoteStream   = null;
let audioEl        = null;
let connected      = false;
let aiMsgEl        = null;
let aiTranscript   = '';
let audioCtx       = null;
let analyser       = null;
let dataArray      = null;
let blobFrame      = null;
let blobEnergy     = 1;

const blobEl   = document.getElementById('maria-blob');
const blobCore = blobEl?.querySelector('.maria-blob-core');

// === HELPERS ===
const getTimeNow = () => {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const setStatus = (text) => {
  if (headerSub) headerSub.textContent = text;
  if (orbHint)   orbHint.textContent   = text;
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

    // IA começa a responder
    case 'response.created':
      openChat();
      aiTranscript = '';
      aiMsgEl = appendBubble('', 'ai');
      if (orbHint) orbHint.textContent = 'Falando...';
      if (headerSub) headerSub.textContent = 'Falando...';
      startBlob();
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
      break;

    // Resposta completa — para escala de volume, volta a ouvir
    case 'response.done':
      stopBlob();
      setStatus('Ouvindo...');
      break;
  }
};

// === BLOB ANIMATION ===
const startBlob = () => {
  if (!remoteStream) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    const src = audioCtx.createMediaStreamSource(remoteStream);
    src.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const tick = () => {
    blobFrame = requestAnimationFrame(tick);
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const target = 1 + (avg / 128) * 0.55;
    blobEnergy += (target - blobEnergy) * 0.12;
    if (blobCore) blobCore.style.transform = `scale(${blobEnergy.toFixed(3)})`;
  };
  tick();
};

const stopBlob = () => {
  if (blobFrame) { cancelAnimationFrame(blobFrame); blobFrame = null; }
  blobEnergy = 1;
  if (blobCore) blobCore.style.transform = 'scale(1)';
};

// === DESCONECTAR ===
const disconnect = () => {
  stopBlob();
  if (audioCtx) { audioCtx.close(); audioCtx = null; analyser = null; dataArray = null; }
  if (dc)          { try { dc.close(); }          catch (_) {} dc = null; }
  if (pc)          { try { pc.close(); }          catch (_) {} pc = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (audioEl)     { audioEl.srcObject = null; audioEl.remove(); audioEl = null; }
  remoteStream = null;
  connected = false;
  blobEl?.classList.remove('active');
  chatMicBtn?.classList.remove('listening');
  mainMicBtn?.classList.remove('listening');
  if (orbBtnLabel) orbBtnLabel.textContent = 'Falar';
  if (orbHint)     orbHint.textContent     = 'Toque para falar';
  if (headerSub)   headerSub.textContent   = 'Online • IA';
};

// === CONECTAR ===
const connect = async () => {
  try {
    openChat();
    setStatus('Conectando...');
    if (orbHint)    orbHint.textContent    = 'Conectando...';
    if (orbBtnLabel) orbBtnLabel.textContent = 'Aguarde...';
    chatMicBtn?.classList.add('listening');
    mainMicBtn?.classList.add('listening');
    blobEl?.classList.add('active');

    // 1. Token efêmero via nosso backend (nunca expõe a API key no frontend)
    const sessionRes = await fetch('/api/realtime-session', { method: 'POST' });
    if (!sessionRes.ok) {
      const errBody = await sessionRes.text().catch(() => '');
      console.error('[RealtimeVoice] Resposta do servidor:', sessionRes.status, errBody);
      throw new Error(`Sessão falhou: ${sessionRes.status} — ${errBody}`);
    }
    const sessionData = await sessionRes.json();
    const token = sessionData.client_secret?.value;
    if (!token) throw new Error('Token não retornado pelo servidor');

    // 2. PeerConnection
    pc = new RTCPeerConnection();

    // 3. Elemento de áudio para a voz da IA
    audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    document.body.appendChild(audioEl);
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; remoteStream = e.streams[0]; };

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
    setStatus('Ouvindo...');
    if (orbBtnLabel) orbBtnLabel.textContent = 'Encerrar';

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
