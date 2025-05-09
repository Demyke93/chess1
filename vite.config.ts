
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Only load componentTagger in development mode, and do it in a way that works with ESM modules
    mode === 'development' && {
      name: 'lovable-tagger-plugin',
      async configResolved(config: any) {
        try {
          // Dynamic import for ESM compatibility
          const module = await import('lovable-tagger');
          const { componentTagger } = module;
          return componentTagger();
        } catch (e) {
          console.warn('Failed to load lovable-tagger plugin, continuing without it:', e);
          return undefined;
        }
      }
    }
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    // Ensures proper Electron compatibility
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
  base: process.env.IS_ELECTRON === 'true' ? './' : '/',
}));
