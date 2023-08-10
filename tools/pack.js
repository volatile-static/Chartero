const compressing = require("compressing"), path = require("path");
const { name } = require('../package.json');

compressing.zip.compressDir(
    path.join('build', "addon"),
    path.join('build', name + '.xpi'),
    { ignoreBase: true }
);
console.log("[Build] Addon pack OK");
