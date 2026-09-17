#!/usr/bin/env node
/**
 * Pack optima-ai and verify install + CLI in a temp project (no registry).
 */
import { mkdtemp, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = await mkdtemp(join(tmpdir(), "optima-smoke-"));

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
}

try {
  console.log("[smoke] building…");
  run("pnpm", ["build"], root);

  console.log("[smoke] packing…");
  const packOut = execFileSync("npm", ["pack", "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  const packed = JSON.parse(packOut);
  const tgzName = packed[0]?.filename || packed.filename;
  const tgz = join(root, tgzName);

  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name: "smoke-app", private: true }, null, 2),
  );

  console.log("[smoke] installing tarball into", dir);
  run("npm", ["install", tgz], dir);

  for (const p of [
    "OPTIMA_RUNTIME.md",
    "AGENTS.md",
    ".optimaignore",
    ".cursor/rules/optima.mdc",
  ]) {
    await access(join(dir, p));
    console.log("[smoke] ok", p);
  }

  console.log("[smoke] optima help");
  run("npx", ["optima", "help"], dir);

  console.log("[smoke] optima doctor");
  run("npx", ["optima", "doctor"], dir);

  console.log("[smoke] optima bench");
  run("npx", ["optima", "bench"], dir);

  console.log("[smoke] optima estimate");
  run(
    "npx",
    ["optima", "estimate", "--file", "OPTIMA_RUNTIME.md", "--model", "claude-sonnet-4"],
    dir,
  );

  console.log("[smoke] PASS");
} finally {
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  // leave tarball for inspect; remove to keep tree clean
  try {
    const { readdirSync, unlinkSync } = await import("node:fs");
    for (const f of readdirSync(root)) {
      if (f.startsWith("optima-ai-") && f.endsWith(".tgz")) unlinkSync(join(root, f));
    }
  } catch {
    // ignore
  }
}
