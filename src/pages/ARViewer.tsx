import { ArrowLeft } from "lucide-react";

const ARViewer = () => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      <button 
        onClick={() => window.location.href = '/'}
        className="absolute top-4 left-4 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center transition-all hover:bg-white/20 active:scale-95"
      >
        <ArrowLeft size={24} />
      </button>
      
      <iframe 
        src="/ar.html"
        className="w-full h-full border-none block"
        allow="camera; microphone; gyroscope; accelerometer; xr-spatial-tracking; autoplay; fullscreen"
      />
    </div>
  );
};

export default ARViewer;
