import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from 'path';
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { TDesignResolver } from "unplugin-vue-components/resolvers";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'firefox60',
    rollupOptions: {
      input: {
        overview: resolve(__dirname, 'overview/index.html'),
        dashboard: resolve(__dirname, 'dashboard/index.html'),
      },
    },
    outDir: '../../builds/addon/content/',
    reportCompressedSize: false
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [
        TDesignResolver({
          library: "vue-next",
        }),
      ],
    }),
    Components({
      resolvers: [
        TDesignResolver({
          library: "vue-next",
        }),
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  base: './'
});
