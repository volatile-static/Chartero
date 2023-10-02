import { execSync } from "child_process";
import cmd from "./zotero-cmd.json" assert { type: "json" };

try {
  execSync(cmd.killZotero);
} catch (e) { }

execSync(cmd.startZotero);
