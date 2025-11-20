
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Sets the base path to relative so assets load correctly on GitHub Pages (e.g. /repo-name/)
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
        // 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || "")
        'process.env.DASHSCOPE_API_KEY': JSON.stringify(env.DASHSCOPE_API_KEY || "")
      }
    };
});
