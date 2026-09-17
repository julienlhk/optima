/**
 * Shared Optima skill installer — used by CLI bin and npm postinstall.
 */
import { access, constants, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const BEGIN = "<!-- optima:begin -->";
const END = "<!-- optima:end -->";

export async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

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

/**
 * Install Optima skills/rules/ignores into a consumer project directory.
 * @param {string} projectDir
 * @param {string} [host]
 * @param {{ root?: string, quiet?: boolean }} [opts]
 */
export async function skillInstall(projectDir, host = "all", opts = {}) {
  const root = opts.root ?? PACKAGE_ROOT;
  const templates = join(root, "templates");
  const skills = join(root, "skills");
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
    for (const skill of ["optima", "context-engineering", "finops-zones"]) {
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

  if (!opts.quiet) {
    console.log(`Optima installed into ${projectDir}`);
    for (const a of actions) console.log(`  • ${a}`);
    console.log(
      "\nNext: open the repo in Cursor/Claude/Codex — agents pick up Optima automatically.",
    );
  }

  return actions;
}

export async function doctor(projectDir) {
  const checks = [
    "AGENTS.md",
    "OPTIMA_RUNTIME.md",
    ".optimaignore",
    ".cursor/rules/optima.mdc",
    ".cursor/skills/optima/SKILL.md",
  ];
  const results = [];
  for (const c of checks) {
    const ok = await exists(join(projectDir, c));
    results.push({ check: c, ok });
  }
  return results;
}

/** Resolve the consumer project when installed via npm/pnpm/yarn. */
export function resolveConsumerRoot() {
  // npm/pnpm set INIT_CWD to the directory where the user ran install
  if (process.env.INIT_CWD) return process.env.INIT_CWD;
  return process.cwd();
}

/** True when installing inside the Optima monorepo itself. */
export async function isOptimaSourceTree(dir) {
  try {
    const pkg = JSON.parse(
      await readFile(join(dir, "package.json"), "utf8"),
    );
    return (
      pkg.name === "optima-ai" ||
      pkg.name === "optima" ||
      (pkg.repository &&
        String(pkg.repository.url || pkg.repository).includes("julienlhk/optima"))
    );
  } catch {
    return false;
  }
}
