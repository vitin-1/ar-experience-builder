import { motion } from "framer-motion";
import huntersLogo from "@/assets/hunters-logo.png";
import { Camera, Terminal, Code2, BookOpen } from "lucide-react";

interface WelcomePageProps {
  onStartAR: () => void;
}

const WelcomePage = ({ onStartAR }: WelcomePageProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#05050A] overflow-hidden pointer-events-auto text-white font-sans"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Background and HUD Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glows */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-cyan-500/10 blur-[150px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] translate-y-1/3 -translate-x-1/4" />
        
        {/* Particle and Data Elements */}
        <div className="absolute top-[15%] left-[5%] flex flex-col gap-2 text-cyan-400/40 text-xs font-mono">
            <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>SYS_V: 88.98</motion.div>
            <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}>FREQ: <span className="text-purple-400/60">144Hz</span></motion.div>
            <div className="h-1 w-24 bg-cyan-900/50 rounded overflow-hidden mt-1">
                <motion.div className="h-full bg-cyan-500/50" animate={{ width: ["10%", "90%", "30%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
            </div>
        </div>

        <div className="absolute top-[30%] right-[8%] flex flex-col gap-2 text-purple-400/40 text-[10px] font-mono items-end hidden md:flex">
            <div>DATA_STREAM // ACTIVE</div>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>93.3%</motion.div>
            <table className="mt-2 text-right opacity-50">
                <tbody>
                    <tr><td className="pr-3 text-cyan-500/50">Cust</td><td>0x88F</td></tr>
                    <tr><td className="pr-3 text-cyan-500/50">Gom</td><td>ACTIVE</td></tr>
                    <tr><td className="pr-3 text-cyan-500/50">Net</td><td>99ms</td></tr>
                </tbody>
            </table>
        </div>

        {/* HUD Overlay Lines */}
        <div className="absolute top-[10%] left-0 w-full h-[1px] bg-cyan-500/10" />
        <div className="absolute bottom-[10%] left-0 w-full h-[1px] bg-purple-500/10" />
        <div className="absolute top-0 left-[10%] w-[1px] h-full bg-cyan-500/5" />
        <div className="absolute top-0 right-[10%] w-[1px] h-full bg-cyan-500/5" />
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center max-w-4xl px-6 z-10 py-12 overflow-y-auto no-scrollbar">
        {/* Vertical Structure */}
        <motion.div
          className="flex flex-col items-center text-center w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Logo Holográfico */}
          <motion.div
            className="relative mb-6 mt-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, type: "spring" }}
          >
            {/* Holographic Glow */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full blur-2xl opacity-20"
              animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            {/* Logo Image */}
            <div className="relative w-28 h-28 mix-blend-screen bg-cyan-950/30 rounded-full flex items-center justify-center border border-cyan-500/30 p-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
               <img
                  src={huntersLogo}
                  alt="Hunters Logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"
               />
               <motion.div className="absolute inset-0 rounded-full border border-purple-500/30" animate={{ rotate: 180 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
               <motion.div className="absolute inset-[-10px] rounded-full border border-cyan-500/20 border-dashed" animate={{ rotate: -180 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
            </div>
            {/* Scanline Effect over logo */}
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none z-20">
              <motion.div className="w-full h-[2px] bg-cyan-300/50 blur-[1px]" animate={{ top: ["-10%", "110%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ position: "absolute" }} />
            </div>
          </motion.div>

          {/* Titles */}
          <h1 className="text-3xl md:text-5xl font-bold tracking-widest text-gray-200 mb-2 uppercase drop-shadow-md" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Hunters Manpower
          </h1>
          <h2 className="text-xs md:text-sm font-semibold tracking-[0.3em] text-cyan-400 mb-8 uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            QUEM SOMOS
          </h2>

          {/* Description */}
          <p className="text-white text-sm md:text-base max-w-2xl leading-relaxed mb-10 opacity-90 font-light text-center" style={{ fontFamily: "'Raleway', sans-serif" }}>
            A Hunters ManPower atua como parceira estratégica de operações que exigem precisão, segurança e alta performance, selecionando profissionais preparados.
          </p>

          {/* Bullets */}
          <div className="flex flex-col gap-4 text-left w-full max-w-2xl mb-12">
            {[
              {
                title: "Precisão",
                desc: "Foco na qualificação para entregar resultados concisos."
              },
              {
                title: "Safety",
                desc: "Desenvolvimento do profissional estratégico."
              },
              {
                title: "High Performance",
                desc: "Preparação para os desafios mais complexos do ambiente offshore."
              }
            ].map((bullet, i) => (
              <motion.div 
                key={bullet.title}
                className="flex items-start gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/5 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.2 }}
              >
                 <div className="mt-1">
                   <div className="w-2 h-2 rounded bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm md:text-base text-gray-300 leading-relaxed font-light" style={{ fontFamily: "'Raleway', sans-serif" }}>
                     <strong className="text-cyan-400 font-medium tracking-wide">{bullet.title}</strong> – {bullet.desc}
                   </p>
                 </div>
              </motion.div>
            ))}
          </div>

          {/* Action Button */}
          <motion.button
            onClick={onStartAR}
            className="group relative flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-4 bg-transparent border border-cyan-500/50 rounded-md overflow-hidden transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] pointer-events-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, type: "spring" }}
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {/* Button Background Effect */}
            <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors" />
            <div className="absolute left-0 top-0 w-1 h-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)] group-hover:w-full transition-all duration-500 opacity-20" />
            
            <Camera className="w-5 h-5 text-cyan-400 relative z-10 group-hover:scale-110 transition-transform" />
            <span className="relative z-10 text-cyan-50 font-semibold tracking-wider text-xs md:text-sm uppercase">
              ABRIR CÂMERA E INICIAR RA
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Footer / Connections */}
      <motion.div 
        className="w-full flex md:flex-row flex-col gap-4 justify-between items-center px-8 pb-6 text-cyan-500/40 text-xs font-mono z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 hover:text-cyan-400 transition-colors cursor-pointer pointer-events-auto">
             <Terminal className="w-4 h-4" /> Integrations
           </div>
           <div className="flex items-center gap-2 hover:text-cyan-400 transition-colors cursor-pointer pointer-events-auto">
             <Code2 className="w-4 h-4" /> Lib
           </div>
           <div className="flex items-center gap-2 hover:text-cyan-400 transition-colors cursor-pointer pointer-events-auto">
             <BookOpen className="w-4 h-4" /> Docs
           </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_5px_rgba(6,182,212,1)]" />
           SYSTEM.ONLINE
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WelcomePage;
