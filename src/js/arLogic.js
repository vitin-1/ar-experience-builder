const scene = document.querySelector('#main-scene');
const loadingScreen = document.getElementById('loading-screen');
const loadingSpinner = document.getElementById('loading-spinner');
const loadingText = document.getElementById('loading-text');
const tapToStart = document.getElementById('tap-to-start');
const errorModal = document.getElementById('error-modal');
const scannerHUD = document.getElementById('scanner-hud');
const videoAsset = document.querySelector('#meuVideo');
const alvo = document.querySelector('#alvo-logo');

// 1. Quando o MindAR estiver pronto, formata a tela para ser tocada
scene.addEventListener('arReady', () => {
  console.log('✅ MindAR pronto — câmera ativa');
  loadingSpinner.style.display = 'none';
  loadingText.style.display = 'none';
  tapToStart.style.display = 'flex'; // Mostra a mensagem de toque
  loadingScreen.style.cursor = 'pointer'; // Transforma toda a tela num botão
});

// Desbloqueia áudio ao tocar em qualquer lugar da tela (apenas se a mensagem estiver visível)
loadingScreen.addEventListener('click', () => {
  if(tapToStart.style.display === 'flex') {
    // Truque para desbloquear autoplay com som no iOS/Android
    videoAsset.muted = false;
    videoAsset.play().then(() => {
      videoAsset.pause();
      videoAsset.currentTime = 0;
      console.log('🔊 Áudio desbloqueado com sucesso');
    }).catch((e) => console.warn('Erro ao desbloquear áudio', e));
    
    loadingScreen.classList.add('hidden'); // Esconde overlay do loading e mostra a câmera
  }
});

// 2. Se o MindAR falhar
scene.addEventListener('arError', (e) => {
  console.error('❌ Erro no MindAR:', e);
  loadingScreen.classList.add('hidden');
  errorModal.classList.add('show');
});

// 3. Integração do Vídeo AR sobre o Alvo
if (alvo && videoAsset) {
  alvo.addEventListener('targetFound', () => {
    console.log('🎯 Alvo Encontrado — reproduzindo holograma');
    videoAsset.muted = false;
    videoAsset.play().catch(() => {
      console.warn('Falha no autoplay — forçando tocado mudo');
      videoAsset.muted = true;
      videoAsset.play().catch(() => {});
    });
    if (scannerHUD) scannerHUD.classList.add('hidden');
  });

  alvo.addEventListener('targetLost', () => {
    console.log('📡 Alvo Perdido — pausando');
    videoAsset.pause();
    if (scannerHUD) scannerHUD.classList.remove('hidden');
  });
}

// 4. Botão Voltar com cleanup
document.getElementById('btn-voltar').addEventListener('click', (e) => {
  e.preventDefault();
  const mindAR = scene.systems['mindar-image-system'];
  if (mindAR) mindAR.stop();
  window.location.href = 'index.html';
});

// 5. Cleanup ao sair da página
window.addEventListener('pagehide', () => {
  const mindAR = scene.systems['mindar-image-system'];
  if (mindAR) mindAR.stop();
});

// 6. Fallback: timeout de 15s previne tela preta infinita
setTimeout(() => {
  if (!loadingScreen.classList.contains('hidden')) {
    console.warn('⏱ Timeout de 15s — escondendo loading');
    loadingScreen.classList.add('hidden');
  }
}, 15000);
