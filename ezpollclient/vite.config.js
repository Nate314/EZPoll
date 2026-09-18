import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    // Keep every asset as a real file so the CSP does not need data: for scripts/styles.
    assetsInlineLimit: 0
  }
});
