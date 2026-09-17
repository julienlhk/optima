#!/usr/bin/env node
/**
 * Optima entrypoint for `npx optima` / `npx github:julienlhk/optima`.
 * Prefers the built CLI; falls back to a zero-build skill installer for init/doctor.
 */
import { spawn } from "node:child_process";
import { access, constants, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

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

const BEGIN = "<!-- optima:begin -->";
const END = "<!-- optima:end -->";

async function upsert(filePath, body) {
  await mkdir(dirname(filePath), { recursive: true });
  const block = `${BEGIN}\n${body.trim()}\n${END}\n`;
  if (!(await exists(filePath))) {
    await writeFile(filePath, block, "utf8");
    return;
  }
  const current = await readFile(filePath, "utf8");
  if (current.includes(BEGIN) && current.includes(END)) {
    await writeFile(
      filePath,
      current.replace(
        new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "m"),
        `${BEGIN}\n${body.trim()}\n${END}`,
      ),
      "utf8",
    );
    return;
  }
  await writeFile(filePath, `${current.trimEnd()}\n\n${block}`, "utf8");
}

async function copySafe(src, dest) {
  try {
    await mkdir(dirname(dest), { recursive: true });
    await cp(src, dest, { recursive: true });
    return true;
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EACCES")) return false;
    throw err;
  }
}

async function skillInstall(projectDir, host = "all") {
  const templates = join(ROOT, "templates");
  const skills = join(ROOT, "skills");
  const actions = [];
  const hosts =
    host === "all"
      ? ["cursor", "claude", "codex", "windsurf"]
      : [host];

  const ignoreSrc = join(templates, "ignore.template");
  for (const name of [
    ".cursorignore",
    ".claudeignore",
    ".codexignore",
    ".geminiignore",
    ".optimaignore",
  ]) {
    if (await copySafe(ignoreSrc, join(projectDir, name))) {
      actions.push(`wrote ${name}`);
    } else {
      actions.push(`skipped ${name}`);
    }
  }

  if (hosts.includes("cursor")) {
    if (
      await copySafe(
        join(templates, "cursor/optima.mdc"),
        join(projectDir, ".cursor/rules/optima.mdc"),
      )
    ) {
      actions.push("wrote .cursor/rules/optima.mdc");
    }
    if (
      await copySafe(
        join(skills, "optima"),
        join(projectDir, ".cursor/skills/optima"),
      )
    ) {
      actions.push("wrote .cursor/skills/optima");
    }
    // companion skills
    for (const skill of ["context-engineering", "finops-zones"]) {
      if (
        await copySafe(
          join(skills, skill),
          join(projectDir, `.cursor/skills/${skill}`),
        )
      ) {
        actions.push(`wrote .cursor/skills/${skill}`);
      }
    }
  }

  if (hosts.includes("windsurf")) {
    if (
      await copySafe(
        join(templates, "windsurf/optima.md"),
        join(projectDir, ".windsurf/rules/optima.md"),
      )
    ) {
      actions.push("wrote .windsurf/rules/optima.md");
    }
  }

  if (hosts.includes("codex") || hosts.includes("claude")) {
    const body = await readFile(join(templates, "AGENTS.block.md"), "utf8");
    await upsert(join(projectDir, "AGENTS.md"), body);
    actions.push("updated AGENTS.md");
  }

  if (hosts.includes("claude")) {
    for (const skill of ["optima", "context-engineering", "finops-zones"]) {
      if (
        await copySafe(
          join(skills, skill),
          join(projectDir, `.claude/skills/${skill}`),
        )
      ) {
        actions.push(`wrote .claude/skills/${skill}`);
      }
    }
    const body = await readFile(join(templates, "CLAUDE.block.md"), "utf8");
    await upsert(join(projectDir, "CLAUDE.md"), body);
    actions.push("updated CLAUDE.md");
  }

  if (
    await copySafe(
      join(templates, "HYBRID_RUNTIME_SPEC.md"),
      join(projectDir, "OPTIMA_RUNTIME.md"),
    )
  ) {
    actions.push("wrote OPTIMA_RUNTIME.md");
  }

  console.log(`Optima installed into ${projectDir}`);
  for (const a of actions) console.log(`  • ${a}`);
  console.log("\nNext: open the repo in Cursor/Claude/Codex — agents will pick up Optima rules & skills.");
}

async function doctor(projectDir) {
  const checks = [
    "AGENTS.md",
    "OPTIMA_RUNTIME.md",
    ".optimaignore",
    ".cursor/rules/optima.mdc",
    ".cursor/skills/optima/SKILL.md",
  ];
  let failed = 0;
  for (const c of checks) {
    const ok = await exists(join(projectDir, c));
    console.log(`[${ok ? "ok" : "MISSING"}] ${c}`);
    if (!ok && !c.includes(".cursor")) failed += 1;
  }
  process.exit(failed === 0 ? 0 : 1);
}

function help() {
  console.log(`optima — install AI/token optimization into any repo

Usage:
  npx optima init [--host all|cursor|claude|codex|windsurf]
  npx optima install          # alias of init
  npx optima doctor
  npx optima help

  # Full CLI (after pnpm build in this monorepo):
  optima analyze | classify | estimate | bench | taxonomy

Skill-style install (agent skills CLI):
  npx skills add julienlhk/optima
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
    "Built CLI not found. Run `pnpm install && pnpm build` in the Optima repo, or use init/doctor from npx.",
  );
  process.exit(1);
}

if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  help();
  process.exit(0);
}

if (cmd === "init" || cmd === "install") {
  // Prefer built CLI when available (full feature set)
  const built = join(ROOT, "packages/cli/dist/bin.js");
  if (await exists(built)) {
    await runBuiltCli(argv);
  }
  let host = "all";
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
  await doctor(process.cwd());
}

help();
process.exit(1);
