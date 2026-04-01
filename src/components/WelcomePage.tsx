import { motion } from "framer-motion";
import huntersLogo from "@/assets/hunters-logo.png";
import { Video } from "lucide-react";

interface WelcomePageProps {
  onStartAR: () => void;
}

const WelcomePage = ({ onStartAR }: WelcomePageProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] overflow-y-auto no-scrollbar pointer-events-auto min-h-screen font-sans"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Background and HUD Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00FFFF]/5 blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#B026FF]/5 blur-[100px]" />
        
        {/* Subtle grid and lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Particle and Data Elements */}
        <div className="absolute top-[10%] left-[5%] flex flex-col gap-2 text-cyan-500/30 text-xs font-mono">
            <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }}>SYS_V: 88.98</motion.div>
            <div className="h-1 w-24 bg-cyan-900/30 rounded overflow-hidden mt-1">
                <motion.div className="h-full bg-cyan-500/40" animate={{ width: ["10%", "90%", "30%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
            </div>
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center max-w-6xl px-6 py-12">
        {/* Logo */}
        <motion.div
          className="relative mb-8 mt-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, type: "spring" }}
        >
          {/* Holographic Glow behind Logo */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl opacity-40"
            style={{ background: 'radial-gradient(circle, #00FFFF 0%, #B026FF 100%)' }}
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <img
            src={huntersLogo}
            alt="Hunters Logo"
            className="relative w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]"
          />
        </motion.div>

        {/* Titles */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-widest leading-none mb-2 font-sans">
            HUNTERS
          </h1>
          <p className="text-lg md:text-2xl text-gray-300 tracking-[0.4em] uppercase font-light">
            MANPOWER
          </p>
        </motion.div>

        {/* Subtitle */}
        <motion.h2 
          className="text-sm md:text-base font-bold tracking-[0.4em] text-[#00FFFF] mb-6 uppercase drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          QUEM SOMOS
        </motion.h2>

        {/* Description */}
        <motion.p 
          className="text-[#D1D5DB] text-center text-base md:text-lg max-w-3xl leading-relaxed mb-16 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          A Hunters ManPower atua como parceira estratégica em operações que exigem precisão, segurança e alta performance, selecionando profissionais preparados.
        </motion.p>

        {/* Highlights Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-16">
          {[
            {
              title: "Precisão",
              desc: " - Foco na qualificação para entregar resultados concisos."
            },
            {
              title: "Safety",
              desc: " - Atuação profissional estratégico."
            },
            {
              title: "High Performance",
              desc: " para enfrentar os desafios mais complexos do ambiente offshore."
            }
          ].map((bullet, i) => (
            <motion.div 
              key={bullet.title}
              className="flex items-start gap-4 p-6 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:border-[#00FFFF]/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.2 }}
            >
               <div className="mt-1.5 flex-shrink-0">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.8)]" />
               </div>
               <div>
                 <p className="text-[#D1D5DB] text-sm md:text-base leading-relaxed font-light text-left">
                   <strong className="text-white font-bold">{bullet.title}</strong>{bullet.desc}
                 </p>
               </div>
            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <motion.button
          onClick={onStartAR}
          className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white/[0.03] backdrop-blur-md border border-[#00FFFF]/50 rounded-lg overflow-hidden transition-all duration-300 hover:border-[#00FFFF] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:bg-[#00FFFF]/10 pointer-events-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6, type: "spring" }}
        >
          <Video className="w-5 h-5 text-[#00FFFF] group-hover:scale-110 transition-transform" />
          <span className="text-[#00FFFF] font-bold tracking-wider text-sm whitespace-nowrap">
            ABRIR CÂMERA E INICIAR RA
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default WelcomePage;
