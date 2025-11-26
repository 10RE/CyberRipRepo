
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Sets the base path to relative so assets load correctly on GitHub Pages (e.g. /repo-name/)
      // base: '/CyberRipRepo/',
      base: '/',
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      proxy: {
          '/socket.io': {
              target: 'http://localhost:3000',
              ws: true
          }
      },
      plugins: [react()],
      define: {
        // Prefer build-time secret from process.env (GitHub Actions) then fallback to .env files.
        'process.env.DASHSCOPE_API_KEY' : JSON.stringify("sk-e264f21c625e401e872037a477c914ac")
        // 'process.env.DASHSCOPE_API_KEY': JSON.stringify(process.env.DASHSCOPE_API_KEY || env.DASHSCOPE_API_KEY || "")
      }
    };
});
