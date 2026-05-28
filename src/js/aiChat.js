const WEBHOOK_URL = 'https://n8n-n8n.ooqqkc.easypanel.host/webhook/1c780a3c-77c7-4daf-a9dd-4695001fd4c1';

// === ELEMENTS ===
const aiInput    = document.getElementById('ai-agent-input');
const aiBtn      = document.querySelector('.ai-eq-btn');
const chatModal  = document.getElementById('ai-chat-modal');
const chatMessages = document.getElementById('chat-messages');
const closeChat  = document.getElementById('close-chat');
const mainInputBar = document.querySelector('.ai-interaction-wrapper');
const headerSub  = document.getElementById('chat-header-sub');
const chatMicBtn = document.getElementById('chat-mic-btn');
const chatMicStatus = document.getElementById('chat-mic-status');
const mainMicBtn = document.querySelector('.ai-mic-btn');

// === SESSION ===
let sessionId = Math.random().toString(36).substring(7);

// === RECORDING STATE ===
let mediaRecorder    = null;
let audioChunks      = [];
let isRecording      = false;
let audioStream      = null;
let volumeSamples    = [];
let audioContext     = null;
let analyserNode     = null;
let samplingInterval = null;

// === HELPERS ===
const getTimeNow = () => {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const formatTime = s => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
};

// === PARSE WEBHOOK RESPONSE ===
const parseReply = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('audio/')) {
    return { type: 'audio', blob: new Blob([await response.arrayBuffer()], { type: contentType }) };
  }
  const raw = await response.text();
  if (!raw) return { type: 'text', text: 'Mensagem recebida!' };
  try {
    const data = JSON.parse(raw);
    let text = data.reply || data.response || data.message || data.output
      || (typeof data === 'string' ? data : raw);
    if (text.startsWith('[') && text.endsWith(']')) {
      const arr = JSON.parse(text);
      if (arr.length > 0 && arr[0].output) text = arr[0].output;
    }
    return { type: 'text', text };
  } catch (_) {
    return { type: 'text', text: raw };
  }
};

// === WAVEFORM HELPERS ===
const buildWaveBarsFromSamples = (samples, barCount = 32) => {
  const pts = [];
  if (samples?.length > 0) {
    const step = samples.length / barCount;
    for (let i = 0; i < barCount; i++) pts.push(samples[Math.floor(i * step)] || 0);
  } else {
    for (let i = 0; i < barCount; i++) pts.push(5);
  }
  const max = Math.max(...pts, 1);
  return pts.map(v => `<span class="wave-bar" style="height:${Math.max(8, Math.round((v / max) * 85 + 5))}%"></span>`).join('');
};

const buildBotWaveBars = (barCount = 32) =>
  Array.from({ length: barCount }, (_, i) => {
    const h = Math.round(30 + Math.sin(i * 0.45) * 22 + Math.random() * 25);
    return `<span class="wave-bar" style="height:${h}%"></span>`;
  }).join('');

const wavePlayerHtml = (id, barsHtml) => `
  <div class="waveform-player" id="${id}">
    <button class="wave-play-btn" aria-label="Play">
      <svg class="icon-play" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <svg class="icon-pause" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    </button>
    <div class="wave-bars">${barsHtml}</div>
    <span class="wave-time">0:00</span>
  </div>
`;

const attachPlayerLogic = (playerId, audio) => {
  const player   = document.getElementById(playerId);
  const playBtn  = player.querySelector('.wave-play-btn');
  const iconPlay = player.querySelector('.icon-play');
  const iconPause = player.querySelector('.icon-pause');
  const bars     = player.querySelectorAll('.wave-bar');
  const timeEl   = player.querySelector('.wave-time');
  let playing = false;

  const setPlaying = (state) => {
    playing = state;
    iconPlay.style.display  = state ? 'none' : '';
    iconPause.style.display = state ? ''     : 'none';
    player.classList.toggle('is-playing', state);
  };

  audio.addEventListener('loadedmetadata', () => { timeEl.textContent = formatTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    timeEl.textContent = formatTime(audio.currentTime);
    const progress = audio.currentTime / audio.duration;
    bars.forEach((bar, i) => bar.classList.toggle('played', i / bars.length <= progress));
  });
  audio.addEventListener('ended', () => {
    setPlaying(false);
    bars.forEach(b => b.classList.remove('played'));
    timeEl.textContent = formatTime(audio.duration);
  });
  playBtn.addEventListener('click', () => {
    playing ? audio.pause() : audio.play();
    setPlaying(!playing);
  });

  return { autoplay: () => audio.play().then(() => setPlaying(true)).catch(() => {}) };
};

// === MESSAGES ===
const appendMessage = (text, sender) => {
  const group = document.createElement('div');
  const isAI = sender.includes('ai');
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
};

const showTypingIndicator = () => {
  if (headerSub) headerSub.textContent = 'digitando...';
  const group = document.createElement('div');
  group.className = 'chat-msg-group ai-group';
  group.id = 'typing-indicator';
  group.innerHTML = `
    <div class="msg-avatar"><img src="/Logo_hunters.png.png" alt="H" onerror="this.textContent='H'"></div>
    <div class="msg-content">
      <div class="chat-msg ai typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  chatMessages.appendChild(group);
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const removeTypingIndicator = () => {
  if (headerSub) headerSub.textContent = 'Online • IA';
  document.getElementById('typing-indicator')?.remove();
};

const appendBotAudioMessage = (audioBlob) => {
  const group = document.createElement('div');
  group.className = 'chat-msg-group ai-group';
  const audio = new Audio(URL.createObjectURL(audioBlob));
  const id = 'audio-bot-' + Date.now();
  group.innerHTML = `
    <div class="msg-avatar"><img src="/Logo_hunters.png.png" alt="H" onerror="this.textContent='H'"></div>
    <div class="msg-content">
      <div class="chat-msg ai audio-msg">${wavePlayerHtml(id, buildBotWaveBars())}</div>
      <span class="msg-time">${getTimeNow()}</span>
    </div>`;
  chatMessages.appendChild(group);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  attachPlayerLogic(id, audio).autoplay();
};

const appendAudioMessage = (audioBlob, samples) => {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg user audio-msg';
  const audio = new Audio(URL.createObjectURL(audioBlob));
  const id = 'audio-' + Date.now();
  msgDiv.innerHTML = wavePlayerHtml(id, buildWaveBarsFromSamples(samples));
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  attachPlayerLogic(id, audio);
};

// === OPEN / CLOSE CHAT ===
const openChat = () => {
  chatModal.classList.remove('hidden');
  if (mainInputBar) mainInputBar.style.display = 'none';
};

// === SEND TEXT MESSAGE ===
const sendMessage = async (inputText = '') => {
  const text = inputText || aiInput.value.trim();
  if (!text) return;

  aiInput.value = '';
  const inlineInput = document.getElementById('chat-inline-input');
  if (inlineInput) inlineInput.value = '';

  openChat();
  appendMessage(text, 'user');
  showTypingIndicator();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sendMessage', sessionId, chatInput: text, message: text })
    });
    removeTypingIndicator();
    if (!response.ok) throw new Error('Erro na rede');

    const result = await parseReply(response);
    result.type === 'audio'
      ? appendBotAudioMessage(result.blob)
      : appendMessage(result.text, 'ai');

  } catch (err) {
    console.error(err);
    removeTypingIndicator();
    appendMessage('Desculpe, ocorreu um erro ao conectar com a IA.', 'ai error');
  }
};

// === SEND AUDIO MESSAGE ===
const sendAudioToWebhook = async (audioBlob, samples) => {
  openChat();
  appendAudioMessage(audioBlob, samples);
  showTypingIndicator();

  try {
    const base64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(audioBlob);
    });

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64, mimeType: audioBlob.type, sessionId, type: 'audio' })
    });
    removeTypingIndicator();
    if (!response.ok) throw new Error('Erro na rede');

    const result = await parseReply(response);
    result.type === 'audio'
      ? appendBotAudioMessage(result.blob)
      : appendMessage(result.text, 'ai');

  } catch (err) {
    console.error(err);
    removeTypingIndicator();
    appendMessage('Desculpe, ocorreu um erro ao enviar o áudio.', 'ai error');
  }
};

// === AUDIO RECORDING ===
const toggleRecording = async () => {
  if (isRecording) {
    mediaRecorder.stop();
    if (samplingInterval) clearInterval(samplingInterval);
    if (audioContext) { audioContext.close(); audioContext = null; }
    return;
  }

  try {
    audioStream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks   = [];
    volumeSamples = [];

    audioContext  = new (window.AudioContext || window.webkitAudioContext)();
    const source  = audioContext.createMediaStreamSource(audioStream);
    analyserNode  = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    source.connect(analyserNode);
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    samplingInterval = setInterval(() => {
      analyserNode.getByteFrequencyData(dataArray);
      volumeSamples.push(dataArray.reduce((a, b) => a + b, 0) / dataArray.length);
    }, 80);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/mp4';

    mediaRecorder = new MediaRecorder(audioStream, { mimeType });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      isRecording = false;
      chatMicBtn?.classList.remove('listening');
      mainMicBtn?.classList.remove('listening');
      if (chatMicStatus) chatMicStatus.textContent = '';
      audioStream.getTracks().forEach(t => t.stop());
      sendAudioToWebhook(new Blob(audioChunks, { type: mimeType }), [...volumeSamples]);
    };

    mediaRecorder.start();
    isRecording = true;
    chatMicBtn?.classList.add('listening');
    mainMicBtn?.classList.add('listening');
    if (chatMicStatus) chatMicStatus.textContent = 'Gravando... toque para parar';

  } catch (err) {
    console.error('Erro ao acessar microfone:', err);
    if (chatMicStatus) chatMicStatus.textContent = 'Permissão de microfone negada';
    alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
  }
};

// === EVENT LISTENERS ===
aiBtn.addEventListener('click', () => sendMessage());
aiInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

const chatInlineInput = document.getElementById('chat-inline-input');
const chatSendBtn     = document.getElementById('chat-send-btn');

chatInlineInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') { const t = chatInlineInput.value.trim(); if (t) sendMessage(t); }
});
chatSendBtn.addEventListener('click', () => {
  const t = chatInlineInput.value.trim(); if (t) sendMessage(t);
});

closeChat.addEventListener('click', () => {
  chatModal.classList.add('hidden');
  if (mainInputBar) mainInputBar.style.display = '';
});

chatMicBtn?.addEventListener('click', toggleRecording);
mainMicBtn?.addEventListener('click', toggleRecording);

// === AR BUTTON TRANSITION ===
const btnUnlock = document.getElementById('btn-unlock');
const app = document.getElementById('app');
if (btnUnlock && app) {
  btnUnlock.addEventListener('click', e => {
    e.preventDefault();
    app.classList.add('dive-out');
    setTimeout(() => { window.location.href = btnUnlock.getAttribute('href'); }, 700);
  });
}

// === MOBILE KEYBOARD ADJUSTMENT ===
if (window.visualViewport) {
  const adjustForKeyboard = () => {
    const modal = document.getElementById('ai-chat-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    const keyboardHeight = window.innerHeight - window.visualViewport.height;
    if (keyboardHeight > 50) {
      modal.style.height = window.visualViewport.height + 'px';
      modal.style.bottom = 'auto';
      modal.style.top    = window.visualViewport.offsetTop + 'px';
    } else {
      modal.style.height = '';
      modal.style.bottom = '';
      modal.style.top    = '';
    }
  };
  window.visualViewport.addEventListener('resize', adjustForKeyboard);
  window.visualViewport.addEventListener('scroll', adjustForKeyboard);
}

// === VISIBILITY CHANGE ===
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (!chatModal.classList.contains('hidden')) chatMessages.scrollTop = chatMessages.scrollHeight;
    if (isRecording && mediaRecorder) mediaRecorder.stop();
  }
});
