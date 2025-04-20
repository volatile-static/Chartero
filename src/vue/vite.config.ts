import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        target: 'firefox128',
        rollupOptions: {
            input: {
                summary: resolve(__dirname, 'summary/index.html'),
                overview: resolve(__dirname, 'overview/index.html'),
                dashboard: resolve(__dirname, 'dashboard/index.html'),
            },
        },
        cssMinify: true,
        outDir: '../../build/addon/content/',
        reportCompressedSize: false
    },
    define: { __test__: false },
    plugins: [
        vue(),
        vueJsx(),
        AutoImport({
            resolvers: [
                TDesignResolver({
                    library: 'vue-next',
                }),
            ],
        }),
        Components({
            resolvers: [
                TDesignResolver({
                    library: 'vue-next',
                }),
            ],
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./utility', import.meta.url)),
            '$': fileURLToPath(new URL('../bootstrap/modules', import.meta.url)),
        },
    },
    base: './',
});
