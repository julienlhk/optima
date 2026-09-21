#!/usr/bin/env node
/**
 * Public CLI for optima-ai
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import {
  PACKAGE_ROOT,
  doctor as runDoctor,
  exists,
  skillInstall,
} from "./lib/install.js";
import { formatDebugReport, runDebug } from "./lib/debug.js";

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
  npx optima debug [--problem "..."] [--write] [--json]
  npx optima analyze [--days N] [--limit N] [--json] [--apply-rules]
  npx optima retrieve --query <text> [--root dir] [--file path]
  npx optima classify <file|->
  npx optima estimate --file <path> [--model id]
  npx optima compare <compress|cache|context|retrieve|session|demo> [options]
  npx optima bench
  npx optima taxonomy
  npx optima help

Compare:
  npx optima compare demo
  npx optima compare compress --file ./log.txt --kind test
  npx optima compare cache --file ./system.txt --turns 100
  npx optima compare context --file ./big.txt --lines 120
  npx optima compare retrieve --query authenticate [--file path | --root dir]
  npx optima compare session --file ./transcript.jsonl

Env:
  OPTIMA_SKIP_POSTINSTALL=1   skip auto-wiring on npm install
  OPTIMA_HOST=cursor          limit hosts on install
`);
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--write") flags.write = true;
    else if (a === "--json") flags.json = true;
    else if (a === "--problem" && args[i + 1]) {
      flags.problem = args[++i];
    } else if (a.startsWith("--problem=")) {
      flags.problem = a.slice("--problem=".length);
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
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

if (cmd === "debug") {
  const { flags } = parseFlags(argv.slice(1));
  const report = await runDebug({
    problem: flags.problem || "",
    write: Boolean(flags.write),
    projectDir: process.cwd(),
  });
  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatDebugReport(report));
  }
  process.exit(0);
}

const advanced = new Set([
  "analyze",
  "retrieve",
  "classify",
  "estimate",
  "compare",
  "bench",
  "taxonomy",
  "parse-fixture",
]);

if (advanced.has(cmd)) {
  await runBuiltCli(argv);
}

help();
process.exit(1);
