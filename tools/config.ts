import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import { build } from 'vite';
import { Config } from 'zotero-plugin-scaffold';
//@ts-expect-error no types
import svg from 'esbuild-plugin-svg';
import { sassPlugin } from 'esbuild-sass-plugin';
import pkg from '../package.json' with { type: 'json' };
import type { BuildOptions } from 'esbuild';
import type { AliasOptions, InlineConfig } from 'vite';

const buildDir = 'build';

export default function loadConfig(isDevBuild: boolean = false, isFullBuild: boolean = false) {
    const esbuildConfig: BuildOptions = {
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
            build: {
                minify: isDevBuild ? false : 'esbuild',
                emptyOutDir: false,
                chunkSizeWarningLimit: 8192,
            },
            define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: String(isDevBuild) },
            resolve: isDevBuild ? { alias: viteResolveOptions } : undefined,
        },
        prefs = Object.keys(pkg.config.defaultSettings).reduce(
            (obj, key) => {
                obj[key] = `id='${pkg.name}-${key}' preference='${pkg.config.addonPref}.${key}'`;
                return obj;
            },
            {} as Record<string, string>,
        );
    return Config.loadConfig({
        name: pkg.config.addonName,
        id: pkg.config.addonID,
        namespace: pkg.name,
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
                ...prefs,
            },
            esbuildOptions: [esbuildConfig],
            hooks: {
                'build:bundle': async () => {
                    buildPrefs();
                    patchLocaleStrings();
                    isFullBuild && (await build(viteConfig));
                },
            },
        },
        release: {
            bumpp: {
                commit: '🔖 Release v',
            },
        },
    });
}

function patchLocaleStrings() {
    const standard = JSON.parse(fs.readFileSync('addon/locale/zh-CN/chartero.json', { encoding: 'utf-8' }));
    for (const locale of ['en-US', 'it-IT', 'ja-JP']) {
        const localeFile = path.join(buildDir, `addon/locale/${locale}/chartero.json`),
            json = JSON.parse(fs.readFileSync(localeFile, { encoding: 'utf-8' })),
            merged = lodash.defaultsDeep(json, standard);
        fs.writeFileSync(localeFile, JSON.stringify(merged));
    }
}

function buildPrefs() {
    function stringifyObj(val: unknown) {
        if (typeof val == 'string') return `'${val}'`;
        else if (typeof val == 'object') return `'${JSON.stringify(val)}'`;
        return val;
    }
    fs.writeFileSync(
        path.join(buildDir, 'addon/prefs.js'),
        Object.entries(pkg.config.defaultSettings)
            .map(([k, v]) => `pref('${pkg.config.addonPref}.${k}', ${stringifyObj(v)});`)
            .join('\n'),
    );
}
