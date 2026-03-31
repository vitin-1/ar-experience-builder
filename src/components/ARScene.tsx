import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Componente de Realidade Aumentada usando A-Frame.
 *
 * INSTRUÇÕES PARA TROCAR O MODELO 3D:
 * 1. Coloque seu arquivo .glb na pasta /public (ex: /public/meu-modelo.glb)
 * 2. Altere o valor de MODEL_PATH abaixo para o caminho do seu modelo
 */

// ====================================================================
// 🔽 TROQUE AQUI O CAMINHO DO SEU MODELO 3D (.glb ou .gltf) 🔽
const MODEL_PATH = "/placeholder-box.glb"; // Ex: "/meu-modelo.glb"
// ====================================================================

const ARScene = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aframeLoaded, setAframeLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // SSR Fix: só renderiza no client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Carrega o script do A-Frame dinamicamente
  useEffect(() => {
    if (!isMounted) return;
    if (document.querySelector('script[src*="aframe"]')) {
      setAframeLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://aframe.io/releases/1.5.0/aframe.min.js";
    script.async = true;
    script.onload = () => {
      // Carrega o AR.js após o A-Frame
      const arScript = document.createElement("script");
      arScript.src =
        "https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js";
      arScript.async = true;
      arScript.onload = () => setAframeLoaded(true);
      document.head.appendChild(arScript);
    };
    document.head.appendChild(script);
  }, [isMounted]);

  // Renderiza a cena A-Frame quando os scripts carregarem
  useEffect(() => {
    if (!aframeLoaded || !containerRef.current) return;

    // Limpa o container
    containerRef.current.innerHTML = "";

    // Cria a cena A-Frame com AR.js via innerHTML
    // Isso é necessário porque o A-Frame precisa parsear as tags custom
    containerRef.current.innerHTML = `
      <a-scene
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false; displayEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
        renderer="logarithmicDepthBuffer: true; antialias: true;"
        vr-mode-ui="enabled: false"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
      >
        <!-- Luzes para iluminar o modelo 3D -->
        <a-light type="ambient" color="#ffffff" intensity="0.8"></a-light>
        <a-light type="directional" color="#ffffff" intensity="0.6" position="1 2 1"></a-light>

        <a-marker preset="hiro">
          <a-box position="0 0.5 0" color="blue"></a-box>
          <!-- <a-entity gltf-model="url(/modelo.glb)"></a-entity> -->
        </a-marker>

        <!-- Exemplo de marcador customizado .patt -->
        <!--
        <a-marker type="pattern" url="/pattern-hunters.patt">
          <a-box position="0 0.5 0" color="red"></a-box>
        </a-marker>
        -->

        <a-entity camera></a-entity>
      </a-scene>
    `;

    // Oculta o loading após breve delay
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [aframeLoaded]);

  if (!isMounted) return null;

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-0 bg-transparent overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-foreground text-sm font-medium">
            Carregando câmera AR...
          </p>
          <p className="text-muted-foreground text-xs mt-2">
            Aponte para um marcador "Hiro" para ver o modelo 3D
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default ARScene;
