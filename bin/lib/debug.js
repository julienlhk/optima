/**
 * Structured debug worksheet + local environment probe.
 * No network. No storage beyond stdout (and optional --write file in project).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { doctor, exists, PACKAGE_ROOT } from "./install.js";

async function readPkgVersion() {
  try {
    const pkg = JSON.parse(
      await readFile(join(PACKAGE_ROOT, "package.json"), "utf8"),
    );
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

const HYPOTHESIS_CATEGORIES = [
  {
    id: "install",
    label: "Install / wiring",
    prompt: "Skills or rules never landed in this project (init/postinstall skipped or failed).",
  },
  {
    id: "host",
    label: "Host / agent",
    prompt: "Cursor/Claude/Codex is not loading always-on rules or skills.",
  },
  {
    id: "config",
    label: "Config / env",
    prompt: "Env/flags wrong (OPTIMA_SKIP_POSTINSTALL, OPTIMA_HOST, wrong cwd).",
  },
  {
    id: "version",
    label: "Version / path",
    prompt: "Stale package version, wrong bin, or monorepo vs npm mismatch.",
  },
  {
    id: "context",
    label: "Context / ignores",
    prompt: "Needed files excluded by ignore boundaries or context packing.",
  },
  {
    id: "logic",
    label: "Logic / code",
    prompt: "Bug in installer, compressor, meter, classifier, or CLI routing.",
  },
  {
    id: "external",
    label: "External / permissions",
    prompt: "OS permissions, sandbox EPERM, or provider/API issue outside Optima.",
  },
];

export function buildWorksheet(problem = "") {
  const lines = [
    "# Optima debug worksheet",
    "",
    "## 1) Frame",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Symptom | ${problem || "_what you observe_"} |`,
    `| Expected | _what should happen_ |`,
    `| Scope | _command / host / when_ |`,
    "",
    "## 2) Hypotheses (5–7, different categories)",
    "",
    "| # | Category | Hypothesis (If X, we would see Y) |",
    "|---|----------|-----------------------------------|",
  ];

  HYPOTHESIS_CATEGORIES.forEach((h, i) => {
    lines.push(`| ${i + 1} | ${h.label} | ${h.prompt} |`);
  });

  lines.push(
    "",
    "## 3) Rank top 1–2",
    "",
    "| Rank | Hypothesis | Why likely | Fast disproof |",
    "|------|------------|------------|---------------|",
    "| H1 | | | |",
    "| H2 | | | |",
    "",
    "## 4) Instrument (before any fix)",
    "",
    "- [ ] `npx optima doctor`",
    "- [ ] Version / path checks below",
    "- [ ] Boundary logs distinguishing H1 vs H2 (stdout only)",
    "",
    "## 5) Evidence",
    "",
    "| Check | Result | Kills which H? |",
    "|-------|--------|----------------|",
    "| | | |",
    "",
    "## 6) Fix (only after confirmation)",
    "",
    "_minimal change_",
    "",
    "## 7) Verify + clean",
    "",
    "- [ ] Repro passes",
    "- [ ] Temp logs removed",
    "- [ ] Root cause one-liner:",
    "",
  );

  return lines.join("\n");
}

export async function probeEnvironment(projectDir = process.cwd()) {
  const version = await readPkgVersion();
  const checks = await doctor(projectDir);
  const env = {
    OPTIMA_SKIP_POSTINSTALL: process.env.OPTIMA_SKIP_POSTINSTALL || "(unset)",
    OPTIMA_HOST: process.env.OPTIMA_HOST || "(unset)",
    OPTIMA_PROJECT_ROOT: process.env.OPTIMA_PROJECT_ROOT || "(unset)",
    NODE_ENV: process.env.NODE_ENV || "(unset)",
  };

  const paths = {
    packageRoot: PACKAGE_ROOT,
    projectDir,
    cliBundle: join(PACKAGE_ROOT, "packages/cli/dist/bin.js"),
    skill: join(projectDir, ".cursor/skills/optima/SKILL.md"),
    debugSkill: join(projectDir, ".cursor/skills/optima-debug/SKILL.md"),
    rule: join(projectDir, ".cursor/rules/optima.mdc"),
  };

  const pathStatus = {};
  for (const [k, p] of Object.entries(paths)) {
    if (k === "packageRoot" || k === "projectDir") {
      pathStatus[k] = { path: p, ok: true };
      continue;
    }
    pathStatus[k] = { path: p, ok: await exists(p) };
  }

  // Likely causes from probe
  const likely = [];
  const missingRequired = checks.filter(
    (c) =>
      !c.ok &&
      ["AGENTS.md", "OPTIMA_RUNTIME.md", ".optimaignore"].includes(c.check),
  );
  if (missingRequired.length) {
    likely.push({
      id: "install",
      reason: `Missing install artifacts: ${missingRequired.map((c) => c.check).join(", ")}`,
      next: "Run: npx optima init",
    });
  }
  if (!pathStatus.cliBundle.ok) {
    likely.push({
      id: "version",
      reason: "CLI bundle missing — incomplete install or old package layout",
      next: "Run: npm i -D optima-ai@latest",
    });
  }
  if (env.OPTIMA_SKIP_POSTINSTALL === "1") {
    likely.push({
      id: "config",
      reason: "OPTIMA_SKIP_POSTINSTALL=1 — postinstall wiring disabled",
      next: "Unset it or run npx optima init manually",
    });
  }
  if (!pathStatus.rule.ok && !pathStatus.skill.ok) {
    likely.push({
      id: "host",
      reason: "No Cursor rule/skill detected in this project",
      next: "npx optima init --host cursor",
    });
  } else if (!pathStatus.skill.ok) {
    likely.push({
      id: "install",
      reason: "Cursor rule present but optima skill folder missing",
      next: "npx optima init --host cursor",
    });
  }
  if (!pathStatus.debugSkill.ok && pathStatus.skill.ok) {
    likely.push({
      id: "version",
      reason: "optima-debug skill missing — re-init after upgrading optima-ai",
      next: "npm i -D optima-ai@latest && npx optima init",
    });
  }

  return {
    privacy:
      "Optima debug runs locally only. No network, no accounts, no telemetry. Probe output is printed here (and optionally written into your project if you pass --write).",
    version,
    env,
    checks,
    paths: pathStatus,
    likely: likely.slice(0, 2),
    categories: HYPOTHESIS_CATEGORIES,
  };
}

export async function runDebug(opts = {}) {
  const projectDir = opts.projectDir || process.cwd();
  const problem = opts.problem || "";
  const probe = await probeEnvironment(projectDir);
  const worksheet = buildWorksheet(problem);

  const report = {
    ...probe,
    problem: problem || null,
    worksheetMarkdown: worksheet,
  };

  if (opts.write) {
    const out = join(projectDir, "OPTIMA_DEBUG.md");
    await mkdir(dirname(out), { recursive: true });
    const body = [
      worksheet,
      "",
      "## Auto probe (local)",
      "",
      "```json",
      JSON.stringify(
        {
          privacy: probe.privacy,
          version: probe.version,
          env: probe.env,
          checks: probe.checks,
          paths: probe.paths,
          likely: probe.likely,
        },
        null,
        2,
      ),
      "```",
      "",
    ].join("\n");
    await writeFile(out, body, "utf8");
    report.written = out;
  }

  return report;
}

export function formatDebugReport(report) {
  const lines = [];
  lines.push("optima debug — local structured debugging");
  lines.push("");
  lines.push(report.privacy);
  lines.push("");
  lines.push(`package version: ${report.version}`);
  if (report.problem) lines.push(`problem: ${report.problem}`);
  lines.push("");
  lines.push("Doctor checks:");
  for (const c of report.checks) {
    lines.push(`  [${c.ok ? "ok" : "MISSING"}] ${c.check}`);
  }
  lines.push("");
  lines.push("Paths:");
  for (const [k, v] of Object.entries(report.paths)) {
    if (k === "packageRoot" || k === "projectDir") {
      lines.push(`  ${k}: ${v.path}`);
    } else {
      lines.push(`  [${v.ok ? "ok" : "MISSING"}] ${k}: ${v.path}`);
    }
  }
  lines.push("");
  if (report.likely.length) {
    lines.push("Most likely (from probe) — validate before fixing:");
    report.likely.forEach((l, i) => {
      lines.push(`  H${i + 1} [${l.id}] ${l.reason}`);
      lines.push(`      next: ${l.next}`);
    });
  } else {
    lines.push("Probe looks healthy — use the worksheet categories to hypothesize.");
  }
  lines.push("");
  lines.push("Next: fill 5–7 hypotheses → rank 1–2 → add discriminating logs → then fix.");
  lines.push("Full skill: .cursor/skills/optima-debug/SKILL.md (after optima init)");
  if (report.written) lines.push(`Wrote worksheet: ${report.written}`);
  return lines.join("\n");
}
