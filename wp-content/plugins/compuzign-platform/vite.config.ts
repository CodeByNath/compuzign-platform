import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'resources/ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        core: 'resources/ts/core/core.ts',
        'cost-builder': 'resources/ts/modules/cost-builder.ts',
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
