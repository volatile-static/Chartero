import { zip } from "compressing";
import { join } from "path";
import details from '../package.json' assert { type: "json" };

zip.compressDir(
    join('build', "addon"),
    join('build', details.name + '.xpi'),
    { ignoreBase: true }
);
console.log("[Build] Addon pack OK");
