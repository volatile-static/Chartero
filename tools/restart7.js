const { execSync, exec } = require("child_process");
const { killZotero, startZotero7 } = require("../zotero-cmd.json");

try {
  execSync(killZotero);
} catch (e) {}

exec(startZotero7);
