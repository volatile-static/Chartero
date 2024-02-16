import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { TDesignResolver } from 'unplugin-vue-components/resolvers';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    build: { minify: false, sourcemap: true },
    esbuild: { sourcemap: 'both' },
    define: { __test__: true },
    plugins: [
        vue(),
        vueJsx(),
        AutoImport({
            resolvers: [TDesignResolver({ library: 'vue-next' })],
        }),
        Components({
            resolvers: [TDesignResolver({ library: 'vue-next' })],
        }),
    ],
    resolve: {
        alias: [
            {
                find: /^highcharts\/(.*)(?<!\.css)$/,
                replacement: 'highcharts/$1.src',
            },
            {
                find: /^highcharts$/,
                replacement: 'highcharts/highcharts.src.js',
            },
            {
                find: 'highcharts-vue',
                replacement: 'highcharts-vue/dist/highcharts-vue.js',
            },
            {
                find: '@',
                replacement: fileURLToPath(new URL('../utility', import.meta.url)),
            },
            {
                find: '$',
                replacement: fileURLToPath(new URL('../../bootstrap/modules', import.meta.url)),
            },
        ],
    },
});
