import { Config } from 'zotero-plugin-scaffold';
import svg from 'esbuild-plugin-svg';
import { sassPlugin } from 'esbuild-sass-plugin';
import pkg from '../package.json' with { type: 'json' };

export default function loadConfig(isDevBuild: boolean) {
    return Config.loadConfig({
        name: pkg.config.addonName,
        id: pkg.config.addonID,
        namespace: pkg.name,
        server: { asProxy: true },
        build: {
            assets: ['addon'],
            define: {
                ...pkg.config,
                author: pkg.author,
                homepage: pkg.homepage,
                releasepage: pkg.releasepage,
                devBuild: isDevBuild
                    ? '<html:h2>Development Build, <html:span style="color: red;">Do NOT</html:span> Use!</html:h2>'
                    : '',
                buildVersion: pkg.version + (isDevBuild ? '-dev' : ''),
                buildTime: '{{buildTime}}',
            },
            esbuildOptions: [
                {
                    target: 'firefox115',
                    define: { __dev__: String(isDevBuild) },
                    plugins: [svg(), sassPlugin({ type: 'css-text', style: 'compressed' })],
                    bundle: true,
                    minify: !isDevBuild,
                    external: ['resource://*', 'chrome://*'],
                },
            ],
        },
    });
}
