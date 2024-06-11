import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Release } from 'zotero-plugin-scaffold';
import loadConfig from './config';

main();

async function main() {
    const config = await loadConfig(false, true),
        releaser = new Release(config);
    await releaser.run();
    if (!process.env.GITHUB_ACTIONS) return;

    const changelog = releaser.getChangelog(),
        tag = releaser.ctx.release.bumpp.tag,
        res = await releaseGitee({
            tag_name: tag,
            name: 'Release ' + tag,
            body: changelog,
            prerelease: 'false',
            target_commitish: 'main',
        }),
        xpi = fs.readFileSync(path.join(releaser.dist, `${releaser.xpiName}.xpi`));
    releaser.logger.info({ changelog, tag, res });
    releaseGitee({ file: xpi }, `/${res.id}/attach_files`);
}

async function releaseGitee(body: Record<string, unknown>, path: string = '') {
    const res = await fetch('https://gitee.com/api/v5/repos/const_volatile/chartero/releases' + path, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, access_token: process.env.GITEE_TOKEN }),
    });
    return (await res.json()) as Record<string, string>;
}
