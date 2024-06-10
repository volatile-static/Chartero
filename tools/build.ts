/* eslint-disable no-console */
import { exit, argv } from 'process';
import { Build } from 'zotero-plugin-scaffold';
import loadConfig from './config';

main().catch(error => {
    console.error(error);
    exit(1);
});

async function main() {
    const config = await loadConfig(argv.includes('--dev'), argv.includes('--full'));
    const builder = new Build(config);
    await builder.run();
}
