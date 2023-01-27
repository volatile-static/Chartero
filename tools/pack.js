const compressing = require("compressing"), path = require("path");
const { name } = require('../package.json');

compressing.zip.compressDir(
    path.join('builds', "addon"),
    path.join('builds', name + '.xpi'),
    { ignoreBase: true }
);
console.log("[Build] Addon pack OK");
