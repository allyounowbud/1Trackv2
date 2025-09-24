import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Fail if port 5173 is not available
    proxy: {
      '/api/pokemon-tcg': {
        target: 'https://api.pokemontcg.io/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pokemon-tcg/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add API key header
            proxyReq.setHeader('X-Api-Key', '96734358-0300-4fdd-a895-140a21f95a50');
          });
        }
      }
    }
  },
  build: {
    // Optimize build for production
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
    ],
  },
})
