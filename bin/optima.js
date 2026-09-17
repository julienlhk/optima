#!/usr/bin/env node
/**
 * Public CLI for optima-ai — clean npm/npx usage:
 *   npm i -D optima-ai
 *   npx optima init
 *   npx optima doctor
 *   npx optima analyze | classify | estimate | bench | taxonomy
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  PACKAGE_ROOT,
  doctor as runDoctor,
  exists,
  skillInstall,
} from "./lib/install.js";

const ROOT = PACKAGE_ROOT;
const BUILT = join(ROOT, "packages/cli/dist/bin.js");

async function runBuiltCli(argv) {
  if (!(await exists(BUILT))) {
    console.error("Optima CLI bundle missing. Reinstall: npm i -D optima-ai@latest");
    process.exit(1);
  }
  const child = spawn(process.execPath, [BUILT, ...argv], {
    stdio: "inherit",
    env: process.env,
  });
  const code = await new Promise((resolve) => child.on("close", resolve));
  process.exit(code ?? 1);
}

function help() {
  console.log(`optima — AI & token optimization

Usage:
  npm i -D optima-ai
  npx optima init [--host all|cursor|claude|codex|windsurf]
  npx optima doctor
  npx optima analyze [--days N] [--limit N] [--json] [--apply-rules]
  npx optima classify <file|->
  npx optima estimate --file <path> [--model id]
  npx optima bench
  npx optima taxonomy
  npx optima help

Env:
  OPTIMA_SKIP_POSTINSTALL=1   skip auto-wiring on npm install
  OPTIMA_HOST=cursor          limit hosts on install
`);
}

const argv = process.argv.slice(2);
const cmd = argv[0] ?? "help";

if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  help();
  process.exit(0);
}

if (cmd === "init" || cmd === "install") {
  let host = process.env.OPTIMA_HOST || "all";
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--host" && argv[i + 1]) host = argv[i + 1];
  }
  await skillInstall(process.cwd(), host);
  process.exit(0);
}

if (cmd === "doctor") {
  const results = await runDoctor(process.cwd());
  let failed = 0;
  for (const r of results) {
    console.log(`[${r.ok ? "ok" : "MISSING"}] ${r.check}`);
    if (!r.ok && !r.check.includes(".cursor")) failed += 1;
  }
  process.exit(failed === 0 ? 0 : 1);
}

const advanced = new Set([
  "analyze",
  "classify",
  "estimate",
  "bench",
  "taxonomy",
  "parse-fixture",
]);

if (advanced.has(cmd)) {
  await runBuiltCli(argv);
}

help();
process.exit(1);
