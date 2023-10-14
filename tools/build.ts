import { build } from "esbuild";
import { sassPlugin } from 'esbuild-sass-plugin';
import { env, exit } from "process";
import fs from "fs";
import path from "path";
import replaceInFile from "replace-in-file";
import details from "../package.json" assert { type: "json" };

const buildDir = "build",
    isDevBuild = env.NODE_ENV == 'development',
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
    const localeMap: Record<string, Record<string, { message: string }>> = {},
        replaceMap = new Map(Object.keys(prefs).map(key => [
            new RegExp(`__${key}__`, 'g'),
            `id='${details.name}-${key}' preference='${details.config.addonPref}.${key}'`
        ]));  // 首选项字段
    replaceMap.set(/__author__/g, details.author);
    replaceMap.set(/__buildTime__/g, buildTime);
    replaceMap.set(/__homepage__/g, details.homepage);
    replaceMap.set(/__releasepage__/g, details.releasepage);
    replaceMap.set(/__buildVersion__/g, details.version + (isDevBuild ? '-dev' : ''));
    replaceMap.set(/__devBuild__/g, isDevBuild ? '<html:h2>Development Build, <html:span style="color: red;">Do NOT</html:span> Use!</html:h2>' : '');


    for (const [key, val] of Object.entries(details.config)) {
        if (typeof val == 'string')  // 常规字段直接替换字符串
            replaceMap.set(new RegExp(`__${key}__`, 'g'), val);
        else if (key != 'defaultSettings' && typeof val == 'object') {  // 多语言字段
            replaceMap.set(new RegExp(`__${key}__`, 'g'), `__MSG_${key}__`);
            for (const lang in val) {
                localeMap[lang] ??= {};
                localeMap[lang][key] = {
                    message: (val as Record<string, string>)[lang]
                };
            }
        }
    }
    // console.debug(replaceMap);
    for (const [lang, msg] of Object.entries(localeMap)) {  // 写入i18n文件
        const dir = path.join(buildDir, `addon/_locales/${lang}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
            path.join(dir, "messages.json"),
            JSON.stringify(msg),
        );
    }

    const optionsAddon = {
        files: [
            `${buildDir}/addon/**/*.xhtml`,
            `${buildDir}/addon/**/*.html`,
            `${buildDir}/addon/**/*.json`,
            `${buildDir}/addon/manifest.json`,
            `${buildDir}/addon/bootstrap.js`,
            'tools/update.json'
        ],
        from: Array.from(replaceMap.keys()),
        to: Array.from(replaceMap.values()),
        countMatches: true,
    };
    const replaceResult = replaceInFileSync(optionsAddon);

    const localeMessage = new Set();
    const localeMessageMiss = new Set();

    const replaceResultFlt = replaceInFileSync({
        files: `${buildDir}/addon/locale/**/*.ftl`,
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
        files: `${buildDir}/addon/**/*.xhtml`,
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
    function stringifyObj(val: unknown) {
        if (typeof val == 'string')
            return `'${val}'`;
        else if (typeof val == 'object')
            return `'${JSON.stringify(val)}'`;
        else
            return val;
    }
    fs.writeFileSync(
        path.join(buildDir, 'addon/prefs.js'),
        Object.entries(prefs).map(
            ([k, v]) => `pref('${details.config.addonPref}.${k}', ${stringifyObj(v)});`
        ).join('\n')
    );
    console.log('[Build] Build prefs.js OK');
}
