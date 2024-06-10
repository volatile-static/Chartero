import path from 'path';
import { Config } from 'zotero-plugin-scaffold';
//@ts-expect-error no types
import svg from 'esbuild-plugin-svg';
import { sassPlugin } from 'esbuild-sass-plugin';
import pkg from '../package.json' with { type: 'json' };
import type { BuildOptions } from 'esbuild';

export default function loadConfig(isDevBuild: boolean) {
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
        },
    });
}
