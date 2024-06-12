import fs from 'fs';
import path from 'path';
//@ts-expect-error no types
import NodeFormData from 'form-data';
import { GiteeClient } from '@gitee/typescript-sdk-v5';
import { Release } from 'zotero-plugin-scaffold';
import loadConfig from './config';

main();

async function main() {
    const config = await loadConfig(false, true),
        releaser = new Release(config);
    await releaser.run();
    if (!process.env.GITHUB_ACTIONS) return;

    const changelog = await releaser.getChangelog(),
        client = new GiteeClient({ TOKEN: process.env.GITEE_TOKEN }),
        release = await client.repositories.postV5ReposOwnerRepoReleases({
            owner: 'const_volatile',
            repo: 'chartero',
            tagName: 'v' + releaser.version,
            name: 'Release' + releaser.version,
            targetCommitish: 'main',
            body: changelog,
        }),
        form = new NodeFormData(),
        xpi = fs.createReadStream(path.join(releaser.dist, `${releaser.xpiName}.xpi`));
    form.append('file', xpi);

    const response = await client.repositories.httpRequest.request({
        method: 'POST',
        url: '/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files',
        path: {
            owner: 'const_volatile',
            repo: 'chartero',
            release_id: release.id,
        },
        // formData: { file: xpi },
        // 因为gitee的api有问题，这里只能手动实现
        // gitee要求不是Blob就转string，但调用form-data时必须是stream。。
        headers: form.getHeaders(),
        body: form,
    });
    releaser.logger.info(response);
}
