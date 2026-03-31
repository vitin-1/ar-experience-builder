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
        {/* Logo */}
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
          <img
            src={huntersLogo}
            alt="Hunters Logo"
            width={160}
            height={160}
            className="relative w-40 h-40 object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
          />
        </motion.div>

        {/* Título */}
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          HUNTERS
        </motion.h1>

        {/* Linha decorativa */}
        <motion.div
          className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent my-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        />

        {/* Quem Somos */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-primary mb-4">
            Quem Somos
          </h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
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
          transition={{ delay: 0.9 }}
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
          transition={{ delay: 1.2 }}
        >
          Powered by WebAR • A-Frame
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default WelcomePage;
