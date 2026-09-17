import type { WasteFinding } from "@optima/core";
import type { Session } from "./models.js";
import type { AnalysisReport } from "./models.js";
import { classify } from "@optima/classify";

const NOISE_PATHS =
  /node_modules|\.git\/|\/dist\/|\/build\/|\.venv|__pycache__|package-lock\.json|pnpm-lock\.yaml|yarn\.lock/i;

const RULE_CATALOG: Record<string, string> = {
  broad_glob:
    "Avoid repo-wide globs like `**/*`; scope Glob/Grep to relevant directories.",
  noisy_reads:
    "Skip reading lockfiles, node_modules, build outputs, and other noise paths.",
  long_session:
    "Prefer fresh sessions for new phases; compact or restart near 60–75% context use.",
  retry_loop:
    "If a prompt is near-identical to the previous one, change strategy instead of retrying.",
  thin_prompt_heavy_explore:
    "State the goal and file paths up front; do not explore the whole repo blindly.",
  runaway_tools:
    "Batch independent tool calls; stop once the answer is known; cap exploratory calls.",
  vague_prompt:
    "Ask specific questions with acceptance criteria; avoid open-ended 'look around' prompts.",
  long_prompt:
    "Keep user prompts focused; move large dumps into targeted file references.",
};

function similarity(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

export function analyzeSession(session: Session): WasteFinding[] {
  const findings: WasteFinding[] = [];
  const userTurns = session.turns.filter((t) => t.role === "user");
  const assistantTurns = session.turns.filter((t) => t.role === "assistant");
  const allTools = session.turns.flatMap((t) => t.tools);

  const reads = allTools.filter((t) => /read/i.test(t.name));
  const globs = allTools.filter((t) => /glob/i.test(t.name));
  const greps = allTools.filter((t) => /grep|search/i.test(t.name));

  for (const g of globs) {
    const pattern = String(g.args?.glob ?? g.args?.pattern ?? g.args?.path ?? "");
    if (/\*\*\/\*|^\*\*$|^\*\.\*$/.test(pattern)) {
      findings.push({
        code: "broad_glob",
        severity: "warn",
        title: "Broad glob pattern",
        detail: pattern || "(empty)",
        techniqueIds: ["ctx.surgical_retrieval", "ctx.ignore_boundaries"],
        score: 8,
      });
    }
  }

  let noisy = 0;
  for (const r of reads) {
    const path = String(r.args?.path ?? r.args?.file ?? r.args?.targetFile ?? "");
    if (NOISE_PATHS.test(path)) noisy += 1;
  }
  if (noisy >= 2) {
    findings.push({
      code: "noisy_reads",
      severity: "warn",
      title: "Noisy path reads",
      detail: `${noisy} reads of lockfiles/build/deps paths`,
      techniqueIds: ["ctx.ignore_boundaries", "ctx.surgical_retrieval"],
      score: 6,
    });
  }

  if (session.turns.length >= 25) {
    findings.push({
      code: "long_session",
      severity: "info",
      title: "Long session",
      detail: `${session.turns.length} turns`,
      techniqueIds: ["ctx.compaction", "sess.turn_minimize"],
      score: 5,
    });
  }

  for (let i = 1; i < userTurns.length; i++) {
    const sim = similarity(userTurns[i - 1]!.text, userTurns[i]!.text);
    if (sim >= 0.72) {
      findings.push({
        code: "retry_loop",
        severity: "warn",
        title: "Similar retry prompts",
        detail: `similarity=${sim.toFixed(2)}`,
        techniqueIds: ["sess.turn_minimize"],
        score: 7,
      });
      break;
    }
  }

  const toolCount = allTools.length;
  const userChars = userTurns.reduce((n, t) => n + t.text.length, 0);
  if (userChars < 80 && toolCount >= 15) {
    findings.push({
      code: "thin_prompt_heavy_explore",
      severity: "warn",
      title: "Thin prompt with heavy exploration",
      detail: `${toolCount} tools after short prompts`,
      techniqueIds: ["ctx.surgical_retrieval", "sess.tool_batching"],
      score: 9,
    });
  }

  if (toolCount >= 20) {
    findings.push({
      code: "runaway_tools",
      severity: "error",
      title: "Runaway tool usage",
      detail: `${toolCount} tool calls`,
      techniqueIds: ["sess.tool_batching", "sess.subagent_bounds"],
      score: 10,
    });
  }

  for (const u of userTurns) {
    if (u.text.length > 4000) {
      findings.push({
        code: "long_prompt",
        severity: "info",
        title: "Very long user prompt",
        detail: `${u.text.length} chars`,
        techniqueIds: ["out.diet_levels", "ctx.progressive_disclosure"],
        score: 3,
      });
      break;
    }
    if (
      /\b(look around|explore the (code)?base|figure it out|check everything)\b/i.test(
        u.text,
      )
    ) {
      findings.push({
        code: "vague_prompt",
        severity: "info",
        title: "Vague exploratory prompt",
        detail: u.text.slice(0, 120),
        techniqueIds: ["sess.turn_minimize", "ctx.surgical_retrieval"],
        score: 4,
      });
      break;
    }
  }

  // assistant:user ratio signal
  if (userTurns.length > 0 && assistantTurns.length / userTurns.length >= 4) {
    findings.push({
      code: "retry_loop",
      severity: "info",
      title: "High assistant:user ratio",
      detail: `${assistantTurns.length}:${userTurns.length}`,
      techniqueIds: ["out.diet_levels", "sess.turn_minimize"],
      score: 4,
    });
  }

  // touch greps count for scoring density
  if (greps.length + reads.length + globs.length === 0 && findings.length === 0) {
    // healthy session — no findings
  }

  return findings;
}

export function analyzeSessions(sessions: Session[]): AnalysisReport {
  const allFindings: WasteFinding[] = [];
  let totalEstimatedTokens = 0;
  for (const s of sessions) {
    totalEstimatedTokens += s.turns.reduce((n, t) => n + t.estimatedTokens, 0);
    allFindings.push(...analyzeSession(s));
  }

  const aggregateByCode: Record<string, number> = {};
  let wasteScore = 0;
  for (const f of allFindings) {
    aggregateByCode[f.code] = (aggregateByCode[f.code] ?? 0) + 1;
    wasteScore += f.score;
  }

  const tailoredRules = [
    ...new Set(
      allFindings
        .map((f) => RULE_CATALOG[f.code])
        .filter((x): x is string => Boolean(x)),
    ),
  ];

  // Enrich with classifier playbook technique names as optional rules
  const classified = classify({ findings: allFindings });
  for (const t of classified.recommended.slice(0, 5)) {
    const bullet = `Apply technique \`${t.id}\`: ${t.summary}`;
    if (!tailoredRules.includes(bullet)) tailoredRules.push(bullet);
  }

  return {
    sessionsAnalyzed: sessions.length,
    totalEstimatedTokens,
    wasteScore,
    findings: allFindings,
    tailoredRules,
    aggregateByCode,
  };
}

export function findingsToMdcSection(rules: string[]): string {
  if (rules.length === 0) return "";
  const body = rules.map((r) => `- ${r}`).join("\n");
  return `# Tailored from recent Cursor sessions\n\n${body}\n`;
}
