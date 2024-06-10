import path from 'path';
import { build } from 'vite';
import { Config } from 'zotero-plugin-scaffold';
//@ts-expect-error no types
import svg from 'esbuild-plugin-svg';
import { sassPlugin } from 'esbuild-sass-plugin';
import pkg from '../package.json' with { type: 'json' };
import type { BuildOptions } from 'esbuild';
import type { AliasOptions, InlineConfig } from 'vite';

export default function loadConfig(isDevBuild: boolean = false, isFullBuild: boolean = false) {
    const buildDir = 'build',
        esbuildConfig: BuildOptions = {
            target: 'firefox115',
            define: { __dev__: String(isDevBuild) },
            plugins: [svg(), sassPlugin({ type: 'css-text', style: 'compressed' })],
            bundle: true,
            minify: !isDevBuild,
            external: ['resource://*', 'chrome://*'],
            outdir: path.join(buildDir, 'addon/content'),
            entryPoints: [
                { in: 'src/bootstrap/index.ts', out: pkg.config.addonName },
                { in: 'src/worker/index.ts', out: `${pkg.config.addonName}-worker` },
            ],
        },
        viteResolveOptions: AliasOptions = [
            {
                find: /^highcharts\/(.*)(?<!\.css)$/,
                replacement: 'highcharts/$1.src',
            },
            {
                find: 'highcharts-vue',
                replacement: 'highcharts-vue/dist/highcharts-vue.js',
            },
        ],
        viteConfig: InlineConfig = {
            root: path.join(buildDir, '../src/vue'),
            build: { minify: isDevBuild ? false : 'esbuild' },
            define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: String(isDevBuild) },
            resolve: isDevBuild ? { alias: viteResolveOptions } : undefined,
        };
    return Config.loadConfig({
        name: pkg.config.addonName,
        id: pkg.config.addonID,
        namespace: pkg.name,
        server: { asProxy: true },
        dist: buildDir,
        build: {
            assets: 'addon/**/*.*',
            define: {
                ...pkg.config,
                author: pkg.author,
                homepage: pkg.homepage,
                releasepage: pkg.releasepage,
                description: 'Charts for Zotero',
                defaultSettings: '',
                devBuild: isDevBuild
                    ? '<html:h2>Development Build, <html:span style="color: red;">Do NOT</html:span> Use!</html:h2>'
                    : '',
                buildVersion: pkg.version + (isDevBuild ? '-dev' : ''),
                buildTime: '{{buildTime}}',
            },
            esbuildOptions: [esbuildConfig],
            hooks: {
                'build:bundle': async () => { isFullBuild && await build(viteConfig); },
            },
        },
    });
}
