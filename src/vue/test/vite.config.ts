import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
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
        AutoImport({
            resolvers: [TDesignResolver({ library: 'vue-next' })],
        }),
        Components({
            resolvers: [TDesignResolver({ library: 'vue-next' })],
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../utility', import.meta.url)),
            '$': fileURLToPath(new URL('../../bootstrap/modules', import.meta.url)),
        },
        dedupe: ['vue'], // Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function.
    },
});
