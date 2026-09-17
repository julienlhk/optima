import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "packages/classify/src/taxonomy.schema.json");
const destDir = join(root, "packages/classify/dist");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "taxonomy.schema.json"));
console.log("copied taxonomy.schema.json");
