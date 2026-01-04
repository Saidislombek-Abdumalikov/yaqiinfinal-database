
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Use empty string fallback to prevent "undefined" string literal issues
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ""),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ""),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || "")
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Mark these as external so they are not bundled, but loaded from CDN (importmap)
      external: ['react', 'react-dom', 'react-dom/client', 'xlsx', '@google/genai', '@supabase/supabase-js', 'recharts'],
      output: {
        manualChunks: undefined,
        format: 'es',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
          '@supabase/supabase-js': 'supabase',
          'recharts': 'Recharts'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js', 'recharts']
  }
});
