import { build } from "esbuild";
import path from "path";
import {
  existsSync,
  lstatSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "fs";
import { env, exit } from "process";
import { sassPlugin } from 'esbuild-sass-plugin';
import replaceInFile from "replace-in-file";
const { replaceInFileSync } = replaceInFile;
import details from "../package.json" assert { type: "json" };

const { name, author, description, homepage, version, config } = details;
const prefs = config.defaultSettings;

const t = new Date();
const buildTime = dateFormat("YYYY-mm-dd HH:MM:SS", new Date());
const buildDir = "build";

const isPreRelease = version.includes("-");

function copyFileSync(source, target) {
  var targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (existsSync(target)) {
    if (lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  writeFileSync(targetFile, readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
  var files = [];

  // Check if folder needs to be created or integrated
  var targetFolder = path.join(target, path.basename(source));
  if (!existsSync(targetFolder)) {
    mkdirSync(targetFolder);
  }

  // Copy
  if (lstatSync(source).isDirectory()) {
    files = readdirSync(source);
    files.forEach(function (file) {
      var curSource = path.join(source, file);
      if (lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

function clearFolder(target) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }

  mkdirSync(target, { recursive: true });
}

function dateFormat(fmt, date) {
  let ret;
  const opt = {
    "Y+": date.getFullYear().toString(),
    "m+": (date.getMonth() + 1).toString(),
    "d+": date.getDate().toString(),
    "H+": date.getHours().toString(),
    "M+": date.getMinutes().toString(),
    "S+": date.getSeconds().toString(),
  };
  for (let k in opt) {
    ret = new RegExp("(" + k + ")").exec(fmt);
    if (ret) {
      fmt = fmt.replace(
        ret[1],
        ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, "0"),
      );
    }
  }
  return fmt;
}

function replaceString() {
  const replaceFrom = [
    /__author__/g,
    /__description__/g,
    /__homepage__/g,
    /__buildVersion__/g,
    /__buildTime__/g,
  ];
  const replaceTo = [author, description, homepage, version, buildTime];

  replaceFrom.push(
    ...[
      ...Object.keys(config),
      ...Object.keys(prefs)
    ].map((k) => new RegExp(`__${k}__`, "g"))
  );
  replaceTo.push(...Object.values(config));
  replaceTo.push(...Object.keys(prefs).map(
    key => `id='${name}-${key}' preference='${config.addonPref}.${key}'`
  ));

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

  if (!isPreRelease) {
    optionsAddon.files.push("tools/update.json");
  }

  const replaceResult = replaceInFileSync(optionsAddon);

  const localeMessage = new Set();
  const localeMessageMiss = new Set();

  const replaceResultFlt = replaceInFileSync({
    files: [`${buildDir}/addon/locale/**/*.ftl`],
    processor: (fltContent) => {
      const lines = fltContent.split("\n");
      const prefixedLines = lines.map((line) => {
        // https://regex101.com/r/lQ9x5p/1
        const match = line.match(
          /^(?<message>[a-zA-Z]\S*)([ ]*=[ ]*)(?<pattern>.*)$/m,
        );
        if (match) {
          localeMessage.add(match.groups.message);
          return `${name}-${line}`;
        } else {
          return line;
        }
      });
      return prefixedLines.join("\n");
    },
  });

  const replaceResultXhtml = replaceInFileSync({
    files: [`${buildDir}/addon/**/*.xhtml`],
    processor: (input) => {
      const matches = [...input.matchAll(/(data-l10n-id)="(\S*)"/g)];
      matches.map((match) => {
        if (localeMessage.has(match[2])) {
          input = input.replace(
            match[0],
            `${match[1]}="${name}-${match[2]}"`,
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
      __dev__: String(process.env.NODE_ENV == 'development'),
    },
    plugins: [sassPlugin({ type: 'css-text', style: 'compressed' })],
    bundle: true,
    minify: process.env.NODE_ENV != 'development',
    outfile: path.join(buildDir, `addon/content/${config.addonName}.js`)
  }).catch(() => exit(1));
}

function buildPrefs() {
  writeFileSync(
    path.join(buildDir, 'addon/prefs.js'),
    Object.entries(prefs).map(
      ([k, v]) => `pref('${config.addonPref}.${k}', ${JSON.stringify(v)});`
    ).join('\n')
  );
  console.log('[Build] Build prefs.js OK');
}

async function main() {
  console.log(
    `[Build] BUILD_DIR=${buildDir}, VERSION=${version}, BUILD_TIME=${buildTime}, ENV=${[
      env.NODE_ENV,
    ]}`,
  );

  clearFolder(buildDir);

  copyFolderRecursiveSync("addon", buildDir);
  buildPrefs();

  if (isPreRelease) {
    console.log(
      "[Build] [Warn] Running in pre-release mode. update.json will not be replaced.",
    );
  } else {
    copyFileSync("tools/update-template.json", "tools/update.json");
  }

  await esbuild();

  console.log("[Build] Run esbuild OK");

  replaceString();

  console.log("[Build] Replace OK");

  console.log(
    `[Build] Finished in ${(new Date().getTime() - t.getTime()) / 1000} s.`,
  );
}

main().catch((err) => {
  console.log(err);
  exit(1);
});
