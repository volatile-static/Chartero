const { execSync } = require("child_process");
const { killZotero, startZotero6 } = require("../zotero-cmd.json");

try {
  execSync(killZotero);
} catch (e) {}

execSync(startZotero6);
