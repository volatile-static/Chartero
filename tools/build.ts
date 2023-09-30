import { build } from "esbuild";
import { sassPlugin } from 'esbuild-sass-plugin';
import { env, exit } from "process";
import fs from "fs";
import path from "path";
import lodash from "lodash";
import replaceInFile from "replace-in-file";
import details from "../package.json" assert { type: "json" };

const buildDir = "build",
    prefs = details.config.defaultSettings,
    now = new Date(),
    buildTime = now.toLocaleString(),
    { replaceInFileSync } = replaceInFile;

main().catch((error) => {
    console.error(error);
    exit(1);
});

async function main() {
    console.log(
        `[Build] BUILD_DIR=${buildDir}, VERSION=${details.version}, BUILD_TIME=${buildTime}, ENV=${[
            env.NODE_ENV,
        ]}`,
    );
    clearFolder(buildDir);

    copyFileSync("tools/update-template.json", "tools/update.json");
    copyFolderRecursiveSync("addon", buildDir);
    buildPrefs();

    await esbuild();
    console.log("[Build] Run esbuild OK");

    replaceString();
    console.log("[Build] Replace OK");

    console.log(
        `[Build] Finished in ${(new Date().getTime() - now.getTime()) / 1000} s.`,
    );
}

function copyFileSync(source: string, target: string) {
    var targetFile = target;

    // If target is a directory, a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source: string, target: string) {
    var files = [];

    // Check if folder needs to be created or integrated
    var targetFolder = path.join(target, path.basename(source));
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    // Copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                copyFileSync(curSource, targetFolder);
            }
        });
    }
}

function clearFolder(target: string) {
    if (fs.existsSync(target))
        fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
}

function replaceString() {
    const replaceFrom = [
        /__author__/g,
        /__description__/g,
        /__homepage__/g,
        /__buildVersion__/g,
        /__buildTime__/g,
    ];
    const replaceTo = [
        details.author,
        details.description,
        details.homepage,
        details.version,
        buildTime
    ];

    replaceFrom.push(...[
        ...Object.keys(details.config).filter(k => k != 'defaultSettings'),
        ...Object.keys(prefs)
    ].map((k) => new RegExp(`__${k}__`, "g")));
    replaceTo.push(
        ...Object.values(details.config).filter(v => typeof v == 'string') as string[]
    );
    replaceTo.push(...Object.keys(prefs).map(
        key => `id='${details.name}-${key}' preference='${details.config.addonPref}.${key}'`
    ));
    if (replaceFrom.length != replaceTo.length) {
        lodash.zip(replaceFrom, replaceTo).forEach(([from, to]) => {
            console.debug(`[Build] Replace ${from} to ${to}`);
        });
        throw new Error("[Build] Replace string length not match.");
    }

    const optionsAddon = {
        files: [
            `${buildDir}/addon/**/*.xhtml`,
            `${buildDir}/addon/**/*.html`,
            `${buildDir}/addon/**/*.json`,
            `${buildDir}/addon/manifest.json`,
            `${buildDir}/addon/bootstrap.js`,
        ],
        from: replaceFrom,
        to: replaceTo,
        countMatches: true,
    };
    optionsAddon.files.push("tools/update.json");
    const replaceResult = replaceInFileSync(optionsAddon);

    const localeMessage = new Set();
    const localeMessageMiss = new Set();

    const replaceResultFlt = replaceInFileSync({
        files: [`${buildDir}/addon/locale/**/*.ftl`],
        //@ts-expect-error
        processor: (fltContent: string) => {
            const lines = fltContent.split("\n");
            const prefixedLines = lines.map((line) => {
                // https://regex101.com/r/lQ9x5p/1
                const match = line.match(
                    /^(?<message>[a-zA-Z]\S*)([ ]*=[ ]*)(?<pattern>.*)$/m,
                );
                if (match) {
                    localeMessage.add(match.groups?.message);
                    return `${details.name}-${line}`;
                } else {
                    return line;
                }
            });
            return prefixedLines.join("\n");
        },
    });

    const replaceResultXhtml = replaceInFileSync({
        files: [`${buildDir}/addon/**/*.xhtml`],
        //@ts-expect-error
        processor: (input) => {
            const matches = [...input.matchAll(/(data-l10n-id)="(\S*)"/g)];
            matches.map((match) => {
                if (localeMessage.has(match[2])) {
                    input = input.replace(
                        match[0],
                        `${match[1]}="${details.name}-${match[2]}"`,
                    );
                } else {
                    localeMessageMiss.add(match[2]);
                }
            });
            return input;
        },
    });

    console.log(
        "[Build] Run replace in ",
        replaceResult
            .filter((f) => f.hasChanged)
            .map((f) => `${f.file} : ${f.numReplacements} / ${f.numMatches}`),
        replaceResultFlt.filter((f) => f.hasChanged).map((f) => `${f.file} : OK`),
        replaceResultXhtml.filter((f) => f.hasChanged).map((f) => `${f.file} : OK`),
    );

    if (localeMessageMiss.size !== 0) {
        console.warn(
            `[Build] [Warn] Fluent message [${new Array(
                ...localeMessageMiss,
            )}] do not exist in addon's locale files.`,
        );
    }
}

async function esbuild() {
    return build({
        target: 'firefox102',
        entryPoints: [path.join(buildDir, "../src/bootstrap/index.ts")],
        define: {
            __dev__: String(env.NODE_ENV == 'development'),
        },
        plugins: [sassPlugin({ type: 'css-text', style: 'compressed' })],
        bundle: true,
        minify: env.NODE_ENV != 'development',
        outfile: path.join(buildDir, `addon/content/${details.config.addonName}.js`)
    }).catch(() => exit(1));
}

function buildPrefs() {
    fs.writeFileSync(
        path.join(buildDir, 'addon/prefs.js'),
        Object.entries(prefs).map(
            ([k, v]) => `pref('${details.config.addonPref}.${k}', ${JSON.stringify(v)});`
        ).join('\n')
    );
    console.log('[Build] Build prefs.js OK');
}
