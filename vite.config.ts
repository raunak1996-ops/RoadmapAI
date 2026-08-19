import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `VITE_BASE_PATH` lets the same build target both a custom domain ("/") and
// a GitHub Pages project site ("/<repo-name>/"). The Pages workflow sets it.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendors so a code change does not
        // invalidate the whole bundle in users' caches.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/recharts') || id.includes('/d3-') || id.includes('/victory-'))
            return 'charts';
          if (id.includes('/@google/genai')) return 'genai';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          )
            return 'react';
          return undefined;
        },
      },
    },
  },
});
