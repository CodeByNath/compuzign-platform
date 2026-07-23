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
        core:             'resources/ts/core/core.ts',
        'cost-builder':  'resources/ts/modules/cost-builder.ts',
        homepage:        'resources/ts/modules/homepage.ts',
        'admin-station': 'resources/ts/modules/admin-station.ts',
        // The shared drawer stylesheet is its own entry so it emits at a stable
        // path (dist/css/drawer-kit.css) for the Admin Station to enqueue.
        // Importing it from the JS entry instead would make Rollup attach it to
        // a shared chunk and emit it under a chunk-derived name that nothing
        // enqueues.
        'drawer-kit':    'resources/css/modules/drawer-kit.css',
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
