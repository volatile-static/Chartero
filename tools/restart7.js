const { execSync } = require("child_process");
const { killZotero, startZotero7 } = require("../zotero-cmd.json");

try {
  execSync(killZotero);
} catch (e) {}

execSync(startZotero7);
