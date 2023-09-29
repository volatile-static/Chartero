import { execSync } from "child_process";
import { killZotero, startZotero } from "./zotero-cmd.json";

try {
  execSync(killZotero);
} catch (e) { }

execSync(startZotero);
