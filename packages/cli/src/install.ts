import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Resolve templates/ from package or monorepo root. */
export async function templatesRoot(): Promise<string> {
  const candidates = [
    join(HERE, "../templates"),
    join(HERE, "../../../templates"),
    join(HERE, "../../templates"),
    join(process.cwd(), "templates"),
  ];
  for (const c of candidates) {
    try {
      await access(c, constants.R_OK);
      return c;
    } catch {
      // try next
    }
  }
  throw new Error("Could not locate templates/ directory");
}

const REQUIRED_SKILLS = [
  "optima",
  "context-engineering",
  "finops-zones",
  "optima-debug",
] as const;

async function skillsDirComplete(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.R_OK);
    for (const skill of REQUIRED_SKILLS) {
      await access(join(dir, skill, "SKILL.md"), constants.R_OK);
    }
    return true;
  } catch {
    return false;
  }
}

export async function skillsRoot(): Promise<string> {
  const candidates = [
    join(HERE, "../../../skills"), // monorepo root (preferred when complete)
    join(HERE, "../skills"), // packages/cli/skills (packaged)
    join(HERE, "../../skills"),
    join(process.cwd(), "skills"),
  ];
  for (const c of candidates) {
    if (await skillsDirComplete(c)) return c;
  }
  throw new Error(
    `Could not locate a complete skills/ directory (need ${REQUIRED_SKILLS.join(", ")})`,
  );
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function writeCopy(src: string, dest: string): Promise<void> {
  const data = await readFile(src);
  await writeFile(dest, data);
}

const BEGIN = "<!-- optima:begin -->";
const END = "<!-- optima:end -->";

export async function upsertMarkedBlock(
  filePath: string,
  body: string,
): Promise<"created" | "updated"> {
  await ensureDir(dirname(filePath));
  const block = `${BEGIN}\n${body.trim()}\n${END}\n`;
  if (!(await exists(filePath))) {
    await writeFile(filePath, block, "utf8");
    return "created";
  }
  const current = await readFile(filePath, "utf8");
  if (current.includes(BEGIN) && current.includes(END)) {
    const next = current.replace(
      new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "m"),
      `${BEGIN}\n${body.trim()}\n${END}`,
    );
    await writeFile(filePath, next, "utf8");
    return "updated";
  }
  await writeFile(filePath, `${current.trimEnd()}\n\n${block}`, "utf8");
  return "updated";
}

export type Host = "cursor" | "claude" | "codex" | "windsurf" | "all";

export async function initProject(
  projectDir: string,
  hosts: Host[] = ["all"],
): Promise<string[]> {
  const root = await templatesRoot();
  const actions: string[] = [];
  const expand =
    hosts.includes("all") || hosts.length === 0
      ? (["cursor", "claude", "codex", "windsurf"] as Host[])
      : hosts;

  const ignoreSrc = join(root, "ignore.template");
  const ignoreNames = [
    ".cursorignore",
    ".claudeignore",
    ".codexignore",
    ".geminiignore",
    ".optimaignore",
  ];
  for (const name of ignoreNames) {
    const dest = join(projectDir, name);
    try {
      await writeCopy(ignoreSrc, dest);
      actions.push(`wrote ${name}`);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        actions.push(`skipped ${name} (${code} — write manually from templates/ignore.template)`);
        continue;
      }
      throw err;
    }
  }

  if (expand.includes("cursor")) {
    try {
      await ensureDir(join(projectDir, ".cursor/rules"));
      await writeCopy(
        join(root, "cursor/optima.mdc"),
        join(projectDir, ".cursor/rules/optima.mdc"),
      );
      actions.push("wrote .cursor/rules/optima.mdc");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        actions.push("skipped .cursor/rules (environment blocked)");
      } else {
        throw err;
      }
    }
    try {
      const skills = await skillsRoot();
      for (const skill of REQUIRED_SKILLS) {
        await ensureDir(join(projectDir, `.cursor/skills/${skill}`));
        await writeCopy(
          join(skills, `${skill}/SKILL.md`),
          join(projectDir, `.cursor/skills/${skill}/SKILL.md`),
        );
        actions.push(`wrote .cursor/skills/${skill}/SKILL.md`);
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        actions.push("skipped .cursor/skills (environment blocked)");
      } else {
        throw err;
      }
    }
  }

  if (expand.includes("windsurf")) {
    try {
      await ensureDir(join(projectDir, ".windsurf/rules"));
      await writeCopy(
        join(root, "windsurf/optima.md"),
        join(projectDir, ".windsurf/rules/optima.md"),
      );
      actions.push("wrote .windsurf/rules/optima.md");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        actions.push("skipped .windsurf/rules (environment blocked)");
      } else {
        throw err;
      }
    }
  }

  if (expand.includes("codex") || expand.includes("claude")) {
    const agentsBody = await readFile(join(root, "AGENTS.block.md"), "utf8");
    const r = await upsertMarkedBlock(join(projectDir, "AGENTS.md"), agentsBody);
    actions.push(`${r} AGENTS.md`);
  }

  if (expand.includes("claude")) {
    try {
      const skills = await skillsRoot();
      for (const skill of REQUIRED_SKILLS) {
        await ensureDir(join(projectDir, `.claude/skills/${skill}`));
        await writeCopy(
          join(skills, `${skill}/SKILL.md`),
          join(projectDir, `.claude/skills/${skill}/SKILL.md`),
        );
        actions.push(`wrote .claude/skills/${skill}/SKILL.md`);
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EPERM" || code === "EACCES") {
        actions.push("skipped .claude/skills (environment blocked)");
      } else {
        throw err;
      }
    }
    const claudeBody = await readFile(join(root, "CLAUDE.block.md"), "utf8");
    const r = await upsertMarkedBlock(join(projectDir, "CLAUDE.md"), claudeBody);
    actions.push(`${r} CLAUDE.md`);
  }

  await writeCopy(
    join(root, "HYBRID_RUNTIME_SPEC.md"),
    join(projectDir, "OPTIMA_RUNTIME.md"),
  );
  actions.push("wrote OPTIMA_RUNTIME.md");

  return actions;
}

export async function doctor(projectDir: string): Promise<
  { check: string; ok: boolean; detail: string }[]
> {
  const checks: { check: string; ok: boolean; detail: string }[] = [];
  const required = ["AGENTS.md", "OPTIMA_RUNTIME.md", ".optimaignore"];
  const optional = [
    ".cursor/rules/optima.mdc",
    ".cursor/skills/optima/SKILL.md",
    ".cursorignore",
  ];
  for (const p of required) {
    const ok = await exists(join(projectDir, p));
    checks.push({
      check: p,
      ok,
      detail: ok ? "present" : "missing — run `optima init`",
    });
  }
  for (const p of optional) {
    const ok = await exists(join(projectDir, p));
    checks.push({
      check: p,
      ok,
      detail: ok
        ? "present"
        : "optional if environment blocks IDE paths — copy from templates/",
    });
  }
  return checks;
}

export function resolveProject(cwd = process.cwd()): string {
  return resolve(cwd);
}
