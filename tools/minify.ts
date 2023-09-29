import fs, { rename } from "fs";
import path from "path";
import lodash from "lodash";

console.time('minify');
renameInFolder('node_modules/highcharts');
renameInFolder('node_modules/highcharts/modules');
console.timeEnd('minify');

function renameInFolder(folder: string) {
    function forEachFiles(from: string[], to: string[], fun: (f: string, t: string) => void) {
        for (const [f, t] of lodash.zip(from, to)) {
            f && t && fun(path.join(folder, f), path.join(folder, t));
        }
    }
    const files = fs.readdirSync(folder, { withFileTypes: true }).filter(f => f.isFile()),
        js = files.filter(file => file.name.endsWith('.js')).map(f => f.name),
        sources = js.filter(file => file.endsWith('.src.js')),
        targets = sources.map(file => file.replace('.src.js', '.js')),
        minified = sources.map(file => file.replace('.src.js', '.min.js'));

    if (process.argv[2] == 'back') {
        forEachFiles(minified, targets, fs.renameSync);
    } else {
        forEachFiles(targets, minified, fs.renameSync);
        forEachFiles(sources, targets, fs.copyFileSync);
    }
}
