/* eslint-disable no-console */
import { exit, argv } from 'process';
import { Build, Serve } from 'zotero-plugin-scaffold';
import loadConfig from './config';

main().catch(error => {
    console.error(error);
    exit(1);
});

async function main() {
    if (argv.includes('--watch')) {
        const config = await loadConfig(true, argv.includes('--full')),
            server = new Serve(config);
        await server.run();
    } else {
        const config = await loadConfig(argv.includes('--dev'), argv.includes('--full'));
        const builder = new Build(config);
        await builder.run();
    }
}
