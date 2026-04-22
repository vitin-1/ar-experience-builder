import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // HTTPS necessário para getUserMedia no celular (câmera AR)
    https: fs.existsSync(path.resolve(__dirname, ".certs/key.pem"))
      ? {
          key: fs.readFileSync(path.resolve(__dirname, ".certs/key.pem")),
          cert: fs.readFileSync(path.resolve(__dirname, ".certs/cert.pem")),
        }
      : undefined,
  },
  plugins: [react(), basicSsl(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
