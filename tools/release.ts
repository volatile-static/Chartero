import fs from 'fs';
import path from 'path';
import NodeFormData from 'form-data';
import { GiteeClient } from '@gitee/typescript-sdk-v5';
import { Release } from 'zotero-plugin-scaffold';
import loadConfig from './config';

const owner = 'const_volatile',
    repo = 'chartero',
    client = new GiteeClient({ TOKEN: process.env.GITEE_TOKEN });

main();

async function main() {
    const config = await loadConfig(false, true),
        releaser = new Release(config);
    // await releaser.run();
    if (!process.env.GITHUB_ACTIONS) return;

    const changelog = await releaser.getChangelog(),
        latestRelease = await rewriteRelease('v' + releaser.version, 'Release' + releaser.version, changelog),
        updateRelease = await rewriteRelease(
            'update',
            'Zotero Auto Update Manifest',
            `Updated in UTC ${new Date().toISOString()} for version ${releaser.version}.`,
            true,
        );
    await uploadAsset(latestRelease.id!, path.join(releaser.dist, `${releaser.xpiName}.xpi`));
    await uploadAsset(updateRelease.id!, path.join(releaser.dist, 'update.json'));
}

async function rewriteRelease(tag: string, name: string, body: string, prerelease = false) {
    const old = await client.repositories.getV5ReposOwnerRepoReleasesTagsTag({ owner, repo, tag });
    if (old?.id)
        return client.repositories.patchV5ReposOwnerRepoReleasesId({
            owner,
            repo,
            name,
            body,
            prerelease,
            id: old.id,
            tagName: tag,
        });
    return client.repositories.postV5ReposOwnerRepoReleases({
        owner,
        repo,
        name,
        body,
        prerelease,
        tagName: tag,
        targetCommitish: 'main',
    });
}

async function uploadAsset(release_id: number, file: string) {
    const form = new NodeFormData(),
        stream = fs.createReadStream(file);
    form.append('file', stream);
    return client.repositories.httpRequest.request({
        method: 'POST',
        url: '/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files',
        path: { owner, repo, release_id },
        // formData: { file: xpi },
        // 因为gitee的api有问题，这里只能手动实现
        // gitee要求不是Blob就转string，但调用form-data时必须是stream。。
        headers: form.getHeaders(),
        body: form,
    });
}
