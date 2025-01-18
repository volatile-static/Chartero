import fs from 'fs';
import path from 'path';
import Gitee from '@gitee/typescript-sdk-v5';
import { Release } from 'zotero-plugin-scaffold';
import loadConfig from './config';

const owner = 'const_volatile', repo = 'chartero';
Gitee.OpenAPI.TOKEN = process.env.GITEE_TOKEN;

main();

async function main() {
    const config = await loadConfig(false, true),
        releaser = new Release(config);
    const { version, dist, xpiName } = releaser.ctx;
    await releaser.run();
    if (!process.env.GITHUB_ACTIONS) return;  // 非CI环境不发布

    const changelog = releaser.ctx.release.changelog as string,
        latestRelease = await rewriteRelease('v' + version, 'Release' + version, changelog),
        updateRelease = await rewriteRelease(
            'update',
            'Zotero Auto Update Manifest',
            `Updated in UTC ${new Date().toISOString()} for version ${version}.`,
            true,
        );
    await rewriteAttach(latestRelease.id!, path.join(dist, `${xpiName}.xpi`));
    await rewriteAttach(updateRelease.id!, path.join(dist, 'update.json'));
}

async function rewriteRelease(tag: string, name: string, body: string, prerelease = false) {
    const old = await Gitee.RepositoriesService.getV5ReposOwnerRepoReleasesTagsTag({ owner, repo, tag });
    if (old?.id)
        return Gitee.RepositoriesService.patchV5ReposOwnerRepoReleasesId({
            owner,
            repo,
            name,
            body,
            prerelease,
            id: old.id,
            tagName: tag,
        });
    return Gitee.RepositoriesService.postV5ReposOwnerRepoReleases({
        owner,
        repo,
        name,
        body,
        prerelease,
        tagName: tag,
        targetCommitish: 'main',
    });
}

async function rewriteAttach(releaseId: number, file: string) {
    const assets = await Gitee.RepositoriesService.getV5ReposOwnerRepoReleasesReleaseIdAttachFiles({
        owner,
        repo,
        releaseId,
    }), fileBuffer = fs.readFileSync(file);
    for (const asset of assets)
        if (asset.name == path.basename(file))
            await Gitee.RepositoriesService
                .deleteV5ReposOwnerRepoReleasesReleaseIdAttachFilesAttachFileId({
                    owner,
                    repo,
                    releaseId,
                    attachFileId: asset.id!,
                })
                .catch(console.error);
    Gitee.RepositoriesService.postV5ReposOwnerRepoReleasesReleaseIdAttachFiles({
        owner,
        repo,
        releaseId,
        file: new File([fileBuffer], path.basename(file), { type: 'application/octet-stream' }),
    });
}
