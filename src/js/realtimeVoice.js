// OpenAI Realtime API — voz-a-voz via WebRTC

const REALTIME_MODEL = 'gpt-4o-realtime-preview';

// === DOM ===
const chatModal    = document.getElementById('ai-chat-modal');
const chatMessages = document.getElementById('chat-messages');
const headerSub    = document.getElementById('chat-header-sub');
const mainInputBar = document.querySelector('.ai-trigger-wrap');
const chatMicBtn    = document.getElementById('chat-mic-btn');
const mainMicBtn    = document.getElementById('main-mic-btn');
const closeChat     = document.getElementById('close-chat');
const btnUnlock     = document.getElementById('btn-unlock');
const orbHint       = document.getElementById('orb-hint');
const orbBtnLabel   = document.getElementById('orb-btn-label');
const muteBtn       = document.getElementById('mute-btn');
const chatTextInput = document.getElementById('chat-text-input');
const chatSendBtn   = document.getElementById('chat-send-btn');
const mainTextInput = document.getElementById('main-text-input');
const mainSendBtn   = document.getElementById('main-send-btn');
const app           = document.getElementById('app');

// === STATE ===
let pc             = null;
let dc             = null;
let localStream    = null;
let micTrack       = null;
let remoteStream   = null;
let audioEl        = null;
let connected      = false;
let isMuted           = false;
let aiMsgEl           = null;
const textChatHistory = [];
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
      // Não zera srcObject — o servidor para de enviar áudio automaticamente.
      // Zerá-lo impedia a IA de falar depois (ontrack só dispara uma vez).
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
    case 'response.output_audio_transcript.delta':
      aiTranscript += event.delta || '';
      if (aiMsgEl) {
        aiMsgEl.textContent = aiTranscript;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      break;

    // Transcript da IA completo
    case 'response.output_audio_transcript.done':
      aiTranscript = '';
      aiMsgEl = null;
      break;

    // Resposta completa — para escala de volume, volta a ouvir
    case 'response.done':
      stopBlob();
      setStatus(isMuted ? 'Microfone mudo' : 'Ouvindo...');
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

// === CHAT DE TEXTO (REST — sem WebRTC) ===
const sendTextToAPI = async (text) => {
  textChatHistory.push({ role: 'user', content: text });

  // Typing indicator
  const group = document.createElement('div');
  group.className = 'chat-msg-group ai-group';
  group.innerHTML = `
    <div class="msg-avatar"><img src="/Logo_hunters.png.png" alt="H" onerror="this.style.display='none'"></div>
    <div class="msg-content">
      <div class="chat-msg ai typing-bubble">
        <span class="typing-dots"><span></span><span></span><span></span></span>
      </div>
    </div>`;
  chatMessages.appendChild(group);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  const bubble = group.querySelector('.chat-msg');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: textChatHistory }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const { reply } = await res.json();
    bubble.className = 'chat-msg ai';
    bubble.textContent = reply;
    textChatHistory.push({ role: 'assistant', content: reply });
  } catch {
    bubble.className = 'chat-msg error';
    bubble.textContent = 'Não foi possível obter resposta. Tente novamente.';
    textChatHistory.pop();
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const handleTextSend = (text, inputEl) => {
  if (!text) return;
  if (inputEl) inputEl.value = '';
  openChat();
  appendBubble(text, 'user');
  sendTextToAPI(text);
};

const sendTextMessage = () => handleTextSend(chatTextInput?.value.trim(), chatTextInput);
const sendMainText    = () => handleTextSend(mainTextInput?.value.trim(), mainTextInput);

// === MUTE TOGGLE ===
const toggleMute = () => {
  if (!micTrack) return;
  isMuted = !isMuted;
  micTrack.enabled = !isMuted;
  muteBtn?.classList.toggle('muted', isMuted);
  if (muteBtn) {
    muteBtn.querySelector('.icon-mic').style.display     = isMuted ? 'none'  : 'block';
    muteBtn.querySelector('.icon-mic-off').style.display = isMuted ? 'block' : 'none';
  }
  if (orbHint) orbHint.textContent = isMuted ? 'Microfone mudo' : 'Ouvindo...';
};

// === DESCONECTAR ===
const disconnect = () => {
  window.__mariaRealtimeActive = false;
  stopBlob();
  if (audioCtx) { audioCtx.close(); audioCtx = null; analyser = null; dataArray = null; }
  if (dc)          { try { dc.close(); }          catch (_) {} dc = null; }
  if (pc)          { try { pc.close(); }          catch (_) {} pc = null; }
  if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  if (audioEl)     { audioEl.srcObject = null; audioEl.remove(); audioEl = null; }
  remoteStream = null;
  micTrack = null;
  isMuted  = false;
  connected = false;
  // Esconde botão de mute e reseta ícones
  if (muteBtn) {
    muteBtn.style.display = 'none';
    muteBtn.classList.remove('muted');
    muteBtn.querySelector('.icon-mic').style.display     = 'block';
    muteBtn.querySelector('.icon-mic-off').style.display = 'none';
  }
  blobEl?.classList.remove('active');
  chatMicBtn?.classList.remove('listening');
  mainMicBtn?.classList.remove('listening');
  if (orbBtnLabel) orbBtnLabel.textContent = 'Falar';
  if (orbHint)     orbHint.textContent     = 'Toque para falar';
  if (headerSub)   headerSub.textContent   = 'Online • IA';
};

// === CONECTAR ===
const connect = async () => {
  if (window.__mariaRealtimeActive) return;
  window.__mariaRealtimeActive = true;
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
      throw new Error(`Sessão falhou: ${sessionRes.status} — ${errBody}`);
    }
    const sessionData = await sessionRes.json();
    const token = sessionData.value;
    if (!token) throw new Error('Token não retornado pelo servidor');

    // 2. PeerConnection
    pc = new RTCPeerConnection();

    // 3. Elemento de áudio para a voz da IA
    audioEl = document.createElement('audio');
    audioEl.autoplay    = true;
    audioEl.playsInline = true;
    audioEl.volume      = 1;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0];
      remoteStream = e.streams[0];
      audioEl.play().catch(() => {});
    };

    // 4. Microfone do usuário — constraints para reduzir vazamento e ruído
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
        sampleRate: 24000,
      },
    });
    micTrack = localStream.getAudioTracks()[0];
    pc.addTransceiver(micTrack, { direction: 'sendrecv', streams: [localStream] });

    // 5. Data channel para eventos (transcrição, status)
    dc = pc.createDataChannel('oai-events');
    dc.onerror   = (err) => console.error('[RealtimeVoice] DataChannel erro:', err);
    dc.onmessage = handleEvent;

    // 6. Oferta SDP
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 7. Troca de SDP com a OpenAI
    const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
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
    // Mostra botão de mute
    if (muteBtn) { muteBtn.style.display = 'flex'; muteBtn.classList.remove('muted'); isMuted = false; micTrack.enabled = true; }

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
muteBtn?.addEventListener('click', toggleMute);
chatSendBtn?.addEventListener('click', sendTextMessage);
chatTextInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTextMessage(); });
mainSendBtn?.addEventListener('click', sendMainText);
mainMicBtn?.addEventListener('click', toggle);
mainTextInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMainText(); });

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
  setTimeout(() => { window.location.href = 'ar.html?t=' + Date.now(); }, 700);
});

// Desconecta ao minimizar / trocar de aba
document.addEventListener('visibilitychange', () => {
  if (document.hidden && connected) disconnect();
});
