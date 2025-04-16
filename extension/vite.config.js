import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'content/content-script.js'),
      },
      output: {
        entryFileNames: 'content/bundle.js',
        assetFileNames: 'content/assets/[name][extname]',
      }
    },
    outDir: '.',
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
    assetsInlineLimit: 0, // Don't inline assets
  }
});