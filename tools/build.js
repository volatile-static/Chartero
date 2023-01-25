const esbuild = require("esbuild");
const compressing = require("compressing");
const path = require("path");
const fs = require("fs");
const process = require("process");
const replace = require("replace-in-file");
const {
  name,
  author,
  description,
  homepage,
  releasepage,
  updaterdf,
  addonName,
  addonID,
  addonRef,
  version,
} = require("../package.json");

function copyFileSync(source, target) {
  var targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
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

function clearFolder(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.mkdirSync(target, { recursive: true });
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
        ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, "0")
      );
    }
  }
  return fmt;
}

async function main() {
  const t = new Date();
  const buildTime = dateFormat("YYYY-mm-dd HH:MM:SS", t);
  const buildDir = "builds";

  console.log(
    `[Build] BUILD_DIR=${buildDir}, VERSION=${version}, BUILD_TIME=${buildTime}, ENV=${[
      process.env.NODE_ENV,
    ]}`
  );

  clearFolder(buildDir);

  copyFolderRecursiveSync("addon", buildDir);

  copyFileSync("tools/update-template.json", "tools/update.json");
  copyFileSync("tools/update-template.rdf", "tools/update.rdf");

  await Promise.all([
    esbuild.build({
      target:'firefox60',
      entryPoints: [path.join(buildDir, "../src/index.ts")],
      define: {
        __dev__: process.env.NODE_ENV == 'development',
      },
      bundle: true,
        external: ['react', 'react-dom'],
      outfile: path.join(buildDir, "addon/chrome/content/scripts/Chartero.js")
    }),
    // esbuild.build({
    //   target:'firefox60',
    //   entryPoints: [
    //     path.join(buildDir, "../src/iframes/overview.tsx"),
    //     path.join(buildDir, "../src/iframes/dashboard.tsx"),
    //     path.join(buildDir, "../src/modules/highcharts.tsx")
    //   ],
    //   outdir: path.join(buildDir, "addon/chrome/content/scripts/"),
    //   entryNames: '[name]',
    //   external: ['react', 'react-dom'],
    //   banner: {
    //     js: `if (typeof require == "undefined") {
    //           Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    //             .getService(Components.interfaces.mozIJSSubScriptLoader)
    //             .loadSubScript('resource://zotero/require.js');
    //         }`
    //   },
    //   bundle: true,
    //   minify: process.env.NODE_ENV != 'development'
    // }),
    esbuild.build({
      target:'firefox60',
      entryPoints: [
        path.join(buildDir, "../src/modules/prefs.tsx")
      ],
      outdir: path.join(buildDir, "addon/chrome/content/scripts/"),
      entryNames: '[name]',
      bundle: true,
      minify: process.env.NODE_ENV != 'development'
    }),
    // esbuild.build({
    //   target:'firefox60',
    //   entryPoints: [
    //     path.join(buildDir, "../src/iframes/lib.ts")
    //   ],
    //   outdir: path.join(buildDir, "addon/chrome/content/scripts/"),
    //   entryNames: '[name]',
    //   bundle: true,
    //   // format:'esm',
    //   minify: process.env.NODE_ENV != 'development'
    // }),
    // esbuild.build({
    //   target:'firefox60',
    //   entryPoints: [
    //     path.join(buildDir, "../src/iframes/test.ts")
    //   ],
    //   outdir: path.join(buildDir, "addon/chrome/content/scripts/"),
    //   entryNames: '[name]',
    //   bundle: true,
    //   // format:'cjs',
    //   minify: process.env.NODE_ENV != 'development'
    // })
  ]).catch(() => process.exit(1));

  console.log("[Build] Run esbuild OK");

  const optionsAddon = {
    files: [
      path.join(buildDir, "**/*.rdf"),
      path.join(buildDir, "**/*.dtd"),
      path.join(buildDir, "**/*.xul"),
      path.join(buildDir, "**/*.xhtml"),
      path.join(buildDir, "**/*.json"),
      path.join(buildDir, "addon/chrome.manifest"),
      path.join(buildDir, "addon/manifest.json"),
      path.join(buildDir, "addon/bootstrap.js"),
      "update.json",
      "update.rdf",
    ],
    from: [
      /__author__/g,
      /__description__/g,
      /__homepage__/g,
      /__releasepage__/g,
      /__updaterdf__/g,
      /__addonName__/g,
      /__addonID__/g,
      /__addonRef__/g,
      /__buildVersion__/g,
      /__buildTime__/g,
    ],
    to: [
      author,
      description,
      homepage,
      releasepage,
      updaterdf,
      addonName,
      addonID,
      addonRef,
      version,
      buildTime,
    ],
    countMatches: true,
  };

  _ = replace.sync(optionsAddon);
  console.log(
    "[Build] Run replace in ",
    _.filter((f) => f.hasChanged).map(
      (f) => `${f.file} : ${f.numReplacements} / ${f.numMatches}`
    )
  );

  console.log("[Build] Replace OK");

  console.log("[Build] Addon prepare OK");

  compressing.zip.compressDir(
    path.join(buildDir, "addon"),
    path.join(buildDir, `${name}.xpi`),
    {
      ignoreBase: true,
    }
  );

  console.log("[Build] Addon pack OK");
  console.log(
    `[Build] Finished in ${(new Date().getTime() - t.getTime()) / 1000} s.`
  );
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});
