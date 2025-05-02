import { defineConfig } from 'vite';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'content/content-script.js'),
        background: resolve(__dirname, 'background/service-worker.js'),
        popup: resolve(__dirname, 'ui/popup.js') // Add popup.js as an entry point
      },
      output: {
        entryFileNames: chunk => {
          if (chunk.name === 'content') 
            return 'content/bundle.js';
          else if (chunk.name === 'popup')
            return 'ui/popup.bundle.js'; // Output popup bundle to ui folder
          else
            return 'background/[name].bundle.js';
        },
        assetFileNames: 'content/assets/[name][extname]',
      }
    },
    outDir: '.',
    emptyOutDir: false,
    minify: true,
    sourcemap: false,
    assetsInlineLimit: 0, // Don't inline assets
  },
  // Define environment variables for browser context
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.API_URL': JSON.stringify(process.env.API_URL),
    // Add any other environment variables you need here
  }
});