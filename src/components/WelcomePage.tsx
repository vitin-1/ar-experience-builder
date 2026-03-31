import { motion } from "framer-motion";
import huntersLogo from "@/assets/hunters-logo.png";

interface WelcomePageProps {
  onStartAR: () => void;
}

const WelcomePage = ({ onStartAR }: WelcomePageProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Efeito de brilho de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
      </div>

      {/* Partículas decorativas */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Logo com animação */}
        <motion.div
          className="relative mb-4"
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 100 }}
        >
          {/* Anel brilhante girando */}
          <motion.div
            className="absolute inset-[-16px] rounded-full border-2 border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{
              background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.15), transparent, transparent)",
            }}
          />
          {/* Glow pulsante */}
          <motion.div
            className="absolute inset-[-8px] rounded-full bg-primary/10 blur-xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <img
            src={huntersLogo}
            alt="Hunters Manpower Logo"
            width={180}
            height={180}
            className="relative w-44 h-44 object-contain drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)] rounded-2xl"
          />
        </motion.div>

        {/* Título HUNTERS com fonte estilizada */}
        <motion.h1
          className="text-5xl md:text-6xl font-black text-foreground tracking-[0.15em] mb-1"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.15em" }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            HUNTERS
          </span>
        </motion.h1>

        {/* Subtítulo Manpower */}
        <motion.p
          className="text-xs md:text-sm uppercase tracking-[0.4em] text-primary/70 font-light mb-4"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Manpower
        </motion.p>

        {/* Linha decorativa */}
        <motion.div
          className="w-20 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent my-5"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        />

        {/* Quem Somos */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-4"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Quem Somos
          </h2>
          <p
            className="text-foreground/90 leading-relaxed text-sm md:text-base font-light italic"
            style={{ fontFamily: "'Raleway', sans-serif", letterSpacing: "0.02em" }}
          >
            A Hunters ManPower nasceu atua como parceira estratégica de operações
            que exigem precisão, segurança e alta performance, selecionando
            profissionais preparados para enfrentar os desafios mais complexos do
            ambiente offshore.
          </p>
        </motion.div>

        {/* Botão CTA */}
        <motion.button
          onClick={onStartAR}
          className="group relative px-8 py-4 rounded-xl font-semibold text-sm uppercase tracking-widest bg-primary text-primary-foreground overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10 flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            ABRIR CÂMERA E INICIAR RA
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.button>

        {/* Rodapé */}
        <motion.p
          className="mt-8 text-xs text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Powered by WebAR • A-Frame
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default WelcomePage;
