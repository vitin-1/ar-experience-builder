import { useState } from "react";
import { motion } from "framer-motion";

const ARScene = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <motion.div
      className="fixed inset-0 z-0 bg-transparent overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <iframe
        src="/ar.html"
        className="fixed inset-0 w-screen h-screen border-none z-0"
        allow="camera; microphone; fullscreen; display-capture; gyroscope; accelerometer; magnetometer"
        onLoad={() => setIsLoading(false)}
      />

      {/* Overlay de carregamento */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm pointer-events-none">
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
