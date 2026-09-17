#!/usr/bin/env node
/**
 * Runs after `npm/pnpm/yarn install optima-ai`.
 * Copies Optima skills/rules into the consuming project (INIT_CWD).
 *
 * Skip with: OPTIMA_SKIP_POSTINSTALL=1
 * Force host: OPTIMA_HOST=cursor|claude|codex|windsurf|all
 */
import {
  isOptimaSourceTree,
  resolveConsumerRoot,
  skillInstall,
} from "./lib/install.js";

if (process.env.OPTIMA_SKIP_POSTINSTALL === "1") {
  process.exit(0);
}

const project = resolveConsumerRoot();

// Don't rewrite the Optima monorepo during its own install
if (await isOptimaSourceTree(project)) {
  process.exit(0);
}

const host = process.env.OPTIMA_HOST || "all";

try {
  console.log(`[optima-ai] wiring skills into ${project}`);
  await skillInstall(project, host);
} catch (err) {
  // Never fail the parent package install — skills can be applied with `npx optima init`
  console.warn("[optima-ai] postinstall skipped:", err?.message || err);
  console.warn("[optima-ai] run manually: npx optima init");
  process.exit(0);
}
