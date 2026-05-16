import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        core: 'resources/ts/core/core.ts',
        'cost-builder': 'resources/ts/modules/cost-builder.ts'
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
