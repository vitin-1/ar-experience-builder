'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Camera } from 'lucide-react';

export default function ARViewer() {
  const [arStarted, setArStarted] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState({
    aframe: false,
    mindar: false,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<HTMLElement>(null);

  // Registro do Componente A-Frame
  // Usamos useEffect para registrar apenas uma vez e no client-side
  useEffect(() => {
    // Só podemos registrar componentes do A-Frame quando o A-Frame foi carregado
    if (!scriptsLoaded.aframe || typeof window === 'undefined') return;

    // Verificação de segurança para não registrar o componente duas vezes
    if (!(window as any).AFRAME) return;
    
    // Deleta o registro anterior caso haja hot-reload longo para evitar erros
    if ((window as any).AFRAME.components['video-handler']) {
      delete (window as any).AFRAME.components['video-handler'];
    }

    (window as any).AFRAME.registerComponent('video-handler', {
      init: function () {
        const video = document.querySelector('#ar-video') as HTMLVideoElement;
        
        // Escuta o evento quando a imagem target é detectada
        this.el.addEventListener('targetFound', () => {
          if (video) {
            video.muted = false;
            // Tenta reproduzir o vídeo. O try/catch previne quebra se houver restrição
            video.play().catch(e => console.error("Erro ao iniciar vídeo:", e));
          }
        });

        // Escuta o evento quando a imagem target é perdida
        this.el.addEventListener('targetLost', () => {
          if (video) {
            video.pause();
            video.muted = true; // mutamos novamente por segurança
          }
        });
      }
    });
  }, [scriptsLoaded.aframe]);

  const handleStartCamera = async () => {
    try {
      // Força o pop-up nativo de permissão do iOS e Android antes do AR iniciar
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Imediatamente encerra o stream "falso" para devolver as tracks
      // O MindAR assumirá a câmera em seguida.
      stream.getTracks().forEach(track => track.stop());
      
      // Inicia a renderização do DOM do A-Frame
      setArStarted(true);
    } catch (error) {
      console.error("Erro ao solicitar acesso à câmera:", error);
      alert("Precisamos de acesso à câmera para a experiência em Realidade Aumentada.");
    }
  };

  // UI de Bloqueio se não tiver permissão/iniciado ainda
  if (!arStarted) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#0B0F19] flex flex-col items-center justify-center relative">
        <div className="flex flex-col items-center z-10 text-white space-y-8 p-6 text-center">
          {/* Logo da Hunters */}
          <div className="w-32 h-32 mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <span className="text-3xl font-extrabold tracking-tighter">HUNTERS</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Experiência AR Interativa</h1>
            <p className="text-sm text-gray-400 max-w-[280px]">
              Para acessar o conteúdo, por favor autorize o uso da câmera e do microfone.
            </p>
          </div>

          <button 
            onClick={handleStartCamera}
            className="group relative flex items-center justify-center gap-3 w-full max-w-[300px] h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-bold shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)]"
          >
            <Camera className="w-5 h-5" />
            INICIAR CÂMERA E ÁUDIO
          </button>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      </div>
    );
  }

  // Cena AR - Renderiza após consentimento
  return (
    <div className="w-screen h-screen overflow-hidden bg-black absolute inset-0">
      {/* 
        Scripts Dinâmicos via Next.js com strategy="afterInteractive" 
        Note que o A-Frame precisa carregar DEPOIS do React estar montado 
        e o MindAR estritamente depois do A-Frame.
      */}
      <Script 
        src="https://aframe.io/releases/1.3.0/aframe.min.js" 
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(prev => ({ ...prev, aframe: true }))}
      />
      {scriptsLoaded.aframe && (
        <Script 
          src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js" 
          strategy="afterInteractive"
          onLoad={() => setScriptsLoaded(prev => ({ ...prev, mindar: true }))}
        />
      )}

      {/* Renderiza as tags estritamente quando os dois scripts estão presentes */}
      {scriptsLoaded.aframe && scriptsLoaded.mindar && (
        <>
          {/* Botão de Voltar para fuga rápida */}
          <button 
            onClick={() => window.location.href = '/'}
            className="absolute top-6 left-6 z-[9999] p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center transition-all active:scale-95"
          >
            Voltar
          </button>

          {/* O container a-scene com as devidas configurações */}
          <a-scene
            ref={sceneRef as any}
            mindar-image="imageTargetSrc: /targets.mind; autoStart: true; uiLoading: no; uiScanning: no;" 
            color-space="sRGB" 
            renderer="colorManagement: true; physicallyCorrectLights: true" 
            vr-mode-ui="enabled: false" 
            device-orientation-permission-ui="enabled: false"
          >
            
            {/* Asset do video */}
            <a-assets>
              <video 
                id="ar-video" 
                ref={videoRef}
                src="/video.mp4" 
                playsInline 
                webkit-playsinline="true"
                loop 
                muted 
                crossOrigin="anonymous"
              />
            </a-assets>

            {/* A Câmera da cena interagindo com o target */}
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

            {/* Alvo #0 da imagem */}
            <a-entity mindar-image-target="targetIndex: 0" video-handler>
              {/* Plano projetando o vídeo */}
              <a-video 
                src="#ar-video" 
                width="1" 
                height="0.5625" 
                position="0 0 0" 
                rotation="0 0 0"
              />
            </a-entity>
          </a-scene>
        </>
      )}
    </div>
  );
}
