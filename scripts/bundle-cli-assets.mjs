import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliPkg = join(root, "packages/cli");
const destTemplates = join(cliPkg, "templates");
const destSkills = join(cliPkg, "skills");

mkdirSync(destTemplates, { recursive: true });
mkdirSync(destSkills, { recursive: true });
cpSync(join(root, "templates"), destTemplates, { recursive: true });
cpSync(join(root, "skills"), destSkills, { recursive: true });
console.log("bundled templates + skills into packages/cli");
