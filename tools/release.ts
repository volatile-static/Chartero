import fs from 'fs';
import path from 'path';
import NodeFormData from 'form-data';
import { OpenAPI } from '@gitee/typescript-sdk-v5';
import { RepositoriesService } from '@gitee/typescript-sdk-v5/src/services.gen';
import type { Release as GiteeRelease } from '@gitee/typescript-sdk-v5';
import { request } from '@gitee/typescript-sdk-v5/src/core/request';
import { Release } from 'zotero-plugin-scaffold';
import loadConfig from './config';

const owner = 'const_volatile', repo = 'chartero';
OpenAPI.TOKEN = process.env.GITEE_TOKEN;

main();

async function main() {
    const config = await loadConfig(false, true),
        releaser = new Release(config);
    await releaser.run();
    if (!process.env.GITHUB_ACTIONS) return;

    const changelog = await releaser.getChangelog(),
        latestRelease = await rewriteRelease('v' + releaser.version, 'Release' + releaser.version, changelog),
        updateRelease = await rewriteRelease(
            'update',
            'Zotero Auto Update Manifest',
            `Updated in UTC ${new Date().toISOString()} for version ${releaser.version}.`,
            true,
        );
    await rewriteAttach(latestRelease, path.join(releaser.dist, `${releaser.xpiName}.xpi`));
    await rewriteAttach(updateRelease, path.join(releaser.dist, 'update.json'));
}

async function rewriteRelease(tag: string, name: string, body: string, prerelease = false) {
    const old = await RepositoriesService.getV5ReposOwnerRepoReleasesTagsTag({ owner, repo, tag });
    if (old?.id)
        return RepositoriesService.patchV5ReposOwnerRepoReleasesId({
            owner,
            repo,
            name,
            body,
            prerelease,
            id: old.id,
            tagName: tag,
        });
    return RepositoriesService.postV5ReposOwnerRepoReleases({
        owner,
        repo,
        name,
        body,
        prerelease,
        tagName: tag,
        targetCommitish: 'main',
    });
}

async function rewriteAttach(release: GiteeRelease, file: string) {
    const assets = await RepositoriesService.getV5ReposOwnerRepoReleasesReleaseIdAttachFiles({
        owner,
        repo,
        releaseId: release.id!,
    }),
        form = new NodeFormData(),
        stream = fs.createReadStream(file);
    for (const asset of assets)
        if (asset.name == path.basename(file))
            await RepositoriesService
                .deleteV5ReposOwnerRepoReleasesReleaseIdAttachFilesAttachFileId({
                    owner,
                    repo,
                    releaseId: release.id!,
                    attachFileId: asset.id!,
                })
                .catch(console.error);
    form.append('file', stream);
    return request(OpenAPI, {
        method: 'POST',
        url: '/v5/repos/{owner}/{repo}/releases/{release_id}/attach_files',
        path: { owner, repo, release_id: release.id },
        // formData: { file: xpi },
        // 因为gitee的api有问题，这里只能手动实现
        // gitee要求不是Blob就转string，但调用form-data时必须是stream。。
        headers: form.getHeaders(),
        body: form,
    });
}
