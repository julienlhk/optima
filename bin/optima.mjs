#!/usr/bin/env node
/**
 * Optima CLI — `npx optima-ai`, `npx optima` (bin), `npm i -D optima-ai`.
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  PACKAGE_ROOT,
  doctor as runDoctor,
  exists,
  skillInstall,
} from "./lib/install.mjs";

const ROOT = PACKAGE_ROOT;

async function runBuiltCli(argv) {
  const built = join(ROOT, "packages/cli/dist/bin.js");
  if (!(await exists(built))) return false;
  const child = spawn(process.execPath, [built, ...argv], {
    stdio: "inherit",
    env: process.env,
  });
  const code = await new Promise((resolve) => child.on("close", resolve));
  process.exit(code ?? 1);
}

function help() {
  console.log(`optima — AI/token optimization for any repo

Install channels:
  npm i -D optima-ai          # postinstall wires skills into the project
  npx optima-ai init          # same, without adding a dependency
  npx github:julienlhk/optima init
  npx skills add julienlhk/optima

Commands:
  optima init [--host all|cursor|claude|codex|windsurf]
  optima install              # alias of init
  optima doctor
  optima help

Full CLI (after building this monorepo):
  optima analyze | classify | estimate | bench | taxonomy

Env:
  OPTIMA_SKIP_POSTINSTALL=1   # skip npm postinstall wiring
  OPTIMA_HOST=cursor          # limit hosts on postinstall/init
`);
}

const argv = process.argv.slice(2);
const cmd = argv[0] ?? "help";

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
  console.error(
    "Built CLI not found. In the Optima repo run: pnpm install && pnpm build",
  );
  process.exit(1);
}

if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  help();
  process.exit(0);
}

if (cmd === "init" || cmd === "install") {
  const built = join(ROOT, "packages/cli/dist/bin.js");
  if (await exists(built)) {
    await runBuiltCli(argv);
  }
  let host = process.env.OPTIMA_HOST || "all";
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--host" && argv[i + 1]) host = argv[i + 1];
  }
  await skillInstall(process.cwd(), host);
  process.exit(0);
}

if (cmd === "doctor") {
  const built = join(ROOT, "packages/cli/dist/bin.js");
  if (await exists(built)) {
    await runBuiltCli(argv);
  }
  const results = await runDoctor(process.cwd());
  let failed = 0;
  for (const r of results) {
    console.log(`[${r.ok ? "ok" : "MISSING"}] ${r.check}`);
    if (!r.ok && !r.check.includes(".cursor")) failed += 1;
  }
  process.exit(failed === 0 ? 0 : 1);
}

help();
process.exit(1);
