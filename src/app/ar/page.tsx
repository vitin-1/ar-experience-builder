'use client';

import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

export default function ARViewer() {
  const [arStarted, setArStarted] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    // Garante que isso só rode no navegador (Client-Side)
    if (typeof window === 'undefined') return;

    // Função para forçar o carregamento dos scripts na ordem certa
    const loadARScripts = async () => {
      try {
        // 1. Injeta o A-Frame primeiro e espera carregar
        await new Promise((resolve, reject) => {
          if ((window as any).AFRAME) return resolve(true);
          const script = document.createElement('script');
          script.src = "https://aframe.io/releases/1.3.0/aframe.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // 2. Injeta o MindAR logo em seguida
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // 3. Registra o nosso componente de vídeo da Hunters
        if ((window as any).AFRAME && !(window as any).AFRAME.components['video-handler']) {
          (window as any).AFRAME.registerComponent('video-handler', {
            init: function () {
              const video = document.querySelector('#ar-video') as HTMLVideoElement;

              this.el.addEventListener('targetFound', () => {
                if (video) {
                  video.muted = false;
                  video.play().catch(e => console.error("Erro Play:", e));
                }
              });

              this.el.addEventListener('targetLost', () => {
                if (video) video.pause();
              });
            }
          });
        }

        // 4. Tudo pronto! Libera a tela inicial.
        setScriptsLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar o motor AR:", error);
      }
    };

    loadARScripts();
  }, []);

  const handleStartCamera = async () => {
    try {
      // O truque mestre para o iOS: pede permissão real antes de renderizar o AR
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      setArStarted(true);
    } catch (error) {
      console.error("Erro câmera:", error);
      alert("Precisamos de acesso à câmera para a RA.");
    }
  };

  // TELA DE CARREGAMENTO (Enquanto injetamos os scripts)
  if (!scriptsLoaded) {
    return (
      <div className="w-screen h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="animate-pulse text-[#00FFFF] font-bold tracking-widest">
          INICIANDO MOTOR AR...
        </div>
      </div>
    );
  }

  // TELA DE BLOQUEIO INICIAL (Aguardando o clique)
  if (!arStarted) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#0B0F19] flex flex-col items-center justify-center relative">
        <div className="flex flex-col items-center z-10 text-white space-y-8 p-6 text-center">
          <div className="w-32 h-32 mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <span className="text-3xl font-extrabold tracking-tighter text-[#00FFFF]">HUNTERS</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Experiência AR</h1>
            <p className="text-sm text-gray-400 max-w-[280px]">
              Autorize o uso da câmera para iniciar o rastreio offshore.
            </p>
          </div>

          <button
            onClick={handleStartCamera}
            className="group relative flex items-center justify-center gap-3 w-full max-w-[300px] h-14 rounded-full bg-[#00FFFF] text-[#0B0F19] font-bold transition-all shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:shadow-[0_0_50px_rgba(0,255,255,0.6)]"
          >
            <Camera className="w-5 h-5" />
            INICIAR CÂMERA
          </button>
        </div>
      </div>
    );
  }

  // CENA AR RENDERIZADA APÓS PERMISSÃO
  return (
    <div className="w-screen h-screen overflow-hidden bg-black absolute inset-0 z-50">
      <button
        onClick={() => window.location.href = '/'}
        className="absolute top-6 left-6 z-[9999] px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold shadow-lg transition-all active:scale-95"
      >
        Voltar
      </button>

      <div dangerouslySetInnerHTML={{
        __html: `
        <a-scene
          mindar-image="imageTargetSrc: /targets.mind; autoStart: true; uiLoading: no; uiScanning: no;" 
          color-space="sRGB" 
          renderer="colorManagement: true; physicallyCorrectLights: true" 
          vr-mode-ui="enabled: false" 
          device-orientation-permission-ui="enabled: false"
        >
          <a-assets>
            <video 
              id="ar-video" 
              src="/video.mp4" 
              playsinline 
              webkit-playsinline="true"
              loop 
              muted 
              crossorigin="anonymous"
            ></video>
          </a-assets>

          <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

          <a-entity mindar-image-target="targetIndex: 0" video-handler>
            <a-video src="#ar-video" width="1" height="0.5625" position="0 0 0" rotation="0 0 0"></a-video>
          </a-entity>
        </a-scene>
      `}} />
    </div>
  );
}