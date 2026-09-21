/**
 * Terminal with/without Optima comparisons (local estimates only).
 */
import {
  estimateTokens,
  formatUsd,
  getModelPricing,
  computeCost,
  type ModelPricing,
} from "@optima/core";
import { compressAuto } from "@optima/compress";
import { parseTranscriptJsonl, analyzeSessions } from "@optima/analyze";
import { retrieve, retrieveInText } from "@optima/retrieve";

export type CompareSide = {
  tokens: number;
  usd: number;
  label: string;
};

export type CompareResult = {
  scenario: string;
  what: string;
  model: string;
  without: CompareSide;
  withOptima: CompareSide;
  savedTokens: number;
  savedUsd: number;
  savedPct: number;
  details?: Record<string, string | number>;
  caveat: string;
};

function requirePricing(model: string): ModelPricing {
  const pricing = getModelPricing(model);
  if (!pricing) throw new Error(`Unknown model: ${model}`);
  return pricing;
}

function inputCost(tokens: number, pricing: ModelPricing): number {
  return computeCost({ inputTokens: tokens, outputTokens: 0 }, pricing).inputUsd;
}

function pack(
  partial: Omit<
    CompareResult,
    "savedTokens" | "savedUsd" | "savedPct" | "withOptima"
  > & { withOptima: CompareSide },
): CompareResult {
  const savedTokens = Math.max(0, partial.without.tokens - partial.withOptima.tokens);
  const savedUsd = Math.max(0, partial.without.usd - partial.withOptima.usd);
  const savedPct =
    partial.without.tokens > 0
      ? (savedTokens / partial.without.tokens) * 100
      : 0;
  return {
    ...partial,
    savedTokens,
    savedUsd,
    savedPct,
  };
}

/** Compress tool/log noise before the model sees it. */
export function compareCompress(
  text: string,
  opts: { kind?: string; model?: string } = {},
): CompareResult {
  const model = opts.model ?? "claude-sonnet-4";
  const pricing = requirePricing(model);
  const kind = opts.kind ?? "auto";
  const withoutTok = estimateTokens(text);
  const compressed = compressAuto(
    text,
    kind === "auto" ? undefined : kind,
  );
  const withTok = estimateTokens(compressed.text);

  return pack({
    scenario: "compress",
    what: `Shrink ${kind === "auto" ? "auto-detected" : kind} tool/log output with compressAuto before model context`,
    model,
    without: {
      tokens: withoutTok,
      usd: inputCost(withoutTok, pricing),
      label: "Full text as model input",
    },
    withOptima: {
      tokens: withTok,
      usd: inputCost(withTok, pricing),
      label: `After compressAuto (${compressed.method})`,
    },
    details: {
      method: compressed.method,
      ratio: Number(compressed.ratio.toFixed(4)),
      charsBefore: text.length,
      charsAfter: compressed.text.length,
    },
    caveat:
      "Deterministic library compression only — not a full agent-session bill guarantee.",
  });
}

/**
 * Prompt-cache discipline: N turns with the same system prefix.
 * Without = pay full input every turn. With = 1 cache write + (N-1) cache reads.
 */
export function compareCache(
  systemText: string,
  opts: { turns?: number; model?: string; userTokensPerTurn?: number } = {},
): CompareResult {
  const model = opts.model ?? "claude-sonnet-4";
  const pricing = requirePricing(model);
  const turns = Math.max(1, opts.turns ?? 100);
  const userPerTurn = opts.userTokensPerTurn ?? 50;
  const systemTok = estimateTokens(systemText);

  const withoutUsage = {
    inputTokens: turns * (systemTok + userPerTurn),
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  const withUsage = {
    inputTokens: turns * userPerTurn,
    outputTokens: 0,
    cacheWriteTokens: systemTok,
    cacheReadTokens: Math.max(0, turns - 1) * systemTok,
  };

  const withoutCost = computeCost(withoutUsage, pricing);
  const withCost = computeCost(withUsage, pricing);

  // Token column = system tokens resent at full input rate (user tokens cancel out).
  const withoutSystemTok = turns * systemTok;
  const withSystemTok = systemTok; // written once; later turns are cache reads (cheaper $)

  return pack({
    scenario: "cache",
    what: `${turns} turns with a stable system prefix (${systemTok} tok) — full input vs cache write/read pricing`,
    model,
    without: {
      tokens: withoutSystemTok,
      usd: withoutCost.totalUsd,
      label: `${turns}× system+user at full input price`,
    },
    withOptima: {
      tokens: withSystemTok,
      usd: withCost.totalUsd,
      label: `1× system cache write + ${Math.max(0, turns - 1)}× cache read + user input`,
    },
    details: {
      systemTokens: systemTok,
      turns,
      userTokensPerTurn: userPerTurn,
      withoutTotalUsd: Number(withoutCost.totalUsd.toFixed(6)),
      withTotalUsd: Number(withCost.totalUsd.toFixed(6)),
      withCacheWriteUsd: Number(withCost.cacheWriteUsd.toFixed(6)),
      withCacheReadUsd: Number(withCost.cacheReadUsd.toFixed(6)),
      withUserInputUsd: Number(withCost.inputUsd.toFixed(6)),
    },
    caveat:
      "Assumes provider prompt caching + stable system prefix. Token column counts system tokens avoided at full input rate; USD uses catalog cache rates.",
  });
}

/**
 * Context dump vs surgical read: full blob vs a line-budgeted excerpt.
 */
export function compareContext(
  text: string,
  opts: { lines?: number; model?: string } = {},
): CompareResult {
  const model = opts.model ?? "claude-sonnet-4";
  const pricing = requirePricing(model);
  const lineBudget = Math.max(1, opts.lines ?? 120);
  const allLines = text.split(/\r?\n/);
  const excerpt =
    allLines.slice(0, lineBudget).join("\n") +
    (allLines.length > lineBudget
      ? `\n… +${allLines.length - lineBudget} lines not read`
      : "");

  const withoutTok = estimateTokens(text);
  const withTok = estimateTokens(excerpt);

  return pack({
    scenario: "context",
    what: `Repo dump (${allLines.length} lines) vs surgical read (first ${lineBudget} lines)`,
    model,
    without: {
      tokens: withoutTok,
      usd: inputCost(withoutTok, pricing),
      label: "Entire file into context",
    },
    withOptima: {
      tokens: withTok,
      usd: inputCost(withTok, pricing),
      label: `Line-range read (≤${lineBudget} lines)`,
    },
    details: {
      totalLines: allLines.length,
      linesRead: Math.min(lineBudget, allLines.length),
    },
    caveat:
      "Illustrates blind line-budget trim — may drop needed context. Prefer `compare retrieve` (search → spans) to keep understanding.",
  });
}

/**
 * Index-style retrieve: search then read spans vs dumping the whole file/tree.
 * Preserves hit neighborhoods — better understanding than blind truncation.
 */
export async function compareRetrieve(
  opts: {
    query: string;
    model?: string;
    /** Single-file mode */
    fileText?: string;
    filePath?: string;
    /** Directory mode */
    root?: string;
    contextLines?: number;
    regex?: boolean;
  },
): Promise<CompareResult> {
  const model = opts.model ?? "claude-sonnet-4";
  const pricing = requirePricing(model);
  const contextLines = opts.contextLines ?? 20;

  if (opts.fileText != null) {
    const path = opts.filePath ?? "file";
    const withoutTok = estimateTokens(opts.fileText);
    const r = await retrieveInText(opts.fileText, opts.query, {
      path,
      contextLines,
      regex: opts.regex,
    });
    const withTok = estimateTokens(r.context || "(no hits)");
    return pack({
      scenario: "retrieve",
      what: `Search "${opts.query}" in ${path} → read ±${contextLines} line spans (not full file)`,
      model,
      without: {
        tokens: withoutTok,
        usd: inputCost(withoutTok, pricing),
        label: "Entire file into context",
      },
      withOptima: {
        tokens: withTok,
        usd: inputCost(withTok, pricing),
        label:
          r.hits.length === 0
            ? "No hits — empty retrieve context"
            : `${r.spans.length} span(s), ${r.hits.length} hit(s)`,
      },
      details: {
        hits: r.hits.length,
        spans: r.spans.length,
        signalKept: r.hits.length
          ? "Match lines + neighborhood — same local understanding as dumping those regions"
          : "No matches — widen query or check path",
        topHits: r.hits
          .slice(0, 5)
          .map((h) => `${h.path}:${h.line}`)
          .join(", "),
      },
      caveat:
        "Preserves understanding around search hits. Unrelated file regions are omitted on purpose (index better, don't blind-trim).",
    });
  }

  const root = opts.root ?? process.cwd();
  const r = await retrieve({
    root,
    query: opts.query,
    contextLines,
    regex: opts.regex,
  });
  const withoutTok = r.stats.fullDumpTokens;
  const withTok = r.stats.retrievedTokens || estimateTokens("(no hits)");

  return pack({
    scenario: "retrieve",
    what: `Search "${opts.query}" under ${root} (${r.filesScanned} files) → ranked spans vs dump-all-scanned`,
    model,
    without: {
      tokens: withoutTok,
      usd: inputCost(withoutTok, pricing),
      label: `Dump all ${r.stats.filesInDump} scanned text files`,
    },
    withOptima: {
      tokens: withTok,
      usd: inputCost(withTok, pricing),
      label:
        r.hits.length === 0
          ? "No hits"
          : `${r.spans.length} span(s) from ${new Set(r.hits.map((h) => h.path)).size} file(s)`,
    },
    details: {
      filesScanned: r.filesScanned,
      hits: r.hits.length,
      spans: r.spans.length,
      savedPctRetrieve: Number(r.stats.savedPct.toFixed(1)),
      signalKept:
        "Hit lines + context windows — prefer this over compress/truncate for source code",
      topHits: r.hits
        .slice(0, 8)
        .map((h) => `${h.path}:${h.line} (score ${h.score})`)
        .join(", "),
    },
    caveat:
      "Local substring/regex index only (no embeddings, no network). Understanding matches the retrieved spans, not omitted files.",
  });
}

/**
 * Cursor transcript: estimated tokens vs heuristic waste reduction.
 * Waste score is mapped to a conservative token discount for illustration.
 */
export function compareSession(
  jsonl: string,
  sourcePath: string,
  opts: { model?: string } = {},
): CompareResult {
  const model = opts.model ?? "claude-sonnet-4";
  const pricing = requirePricing(model);
  const session = parseTranscriptJsonl(jsonl, sourcePath, Date.now());
  const report = analyzeSessions([session]);
  const withoutTok = report.totalEstimatedTokens;
  // Map waste score → estimated reclaimable fraction (capped)
  const reclaimFrac = Math.min(0.55, report.wasteScore * 0.04);
  const withTok = Math.max(
    0,
    Math.round(withoutTok * (1 - reclaimFrac)),
  );

  return pack({
    scenario: "session",
    what: `Local transcript waste heuristics (${sourcePath})`,
    model,
    without: {
      tokens: withoutTok,
      usd: inputCost(withoutTok, pricing),
      label: "Estimated session tokens as-is",
    },
    withOptima: {
      tokens: withTok,
      usd: inputCost(withTok, pricing),
      label: `After applying Optima waste reductions (~${(reclaimFrac * 100).toFixed(0)}% of scored waste)`,
    },
    details: {
      wasteScore: report.wasteScore,
      findings: Object.keys(report.aggregateByCode).length,
      findingCodes: Object.entries(report.aggregateByCode)
        .map(([k, v]) => `${k}×${v}`)
        .join(", ") || "(none)",
      reclaimFraction: Number(reclaimFrac.toFixed(3)),
    },
    caveat:
      "Heuristic illustration from transcript findings — not a measured A/B bill.",
  });
}

export function demoFixtures(): {
  compressLog: string;
  systemPrompt: string;
  contextDump: string;
  retrieveSource: string;
} {
  const compressLog = [
    "Test Suites: 1 failed, 12 passed, 13 total",
    "Tests:       1 failed, 84 passed, 85 total",
    ...Array.from({ length: 40 }, (_, i) => `PASS src/ok${i}.test.ts`),
    "FAIL src/auth.test.ts",
    "  ● login › rejects bad password",
    "    Expected 401, received 200",
    "",
  ].join("\n");

  const systemPrompt =
    "You are Optima, a careful coding agent. Prefer grep before read. " +
    "Sacred code stays precise. Ops replies stay terse.\n".repeat(60);

  const contextDump = [
    "# lockfile noise",
    ...Array.from(
      { length: 400 },
      (_, i) => `"pkg-${i}@1.0.0": { "resolved": "https://example/${i}" }`,
    ),
  ].join("\n");

  const retrieveSource = [
    ...Array.from({ length: 100 }, (_, i) => `// noise ${i}`),
    "export function authenticate(user: string, password: string) {",
    "  return user.length > 0 && password.length > 8;",
    "}",
    ...Array.from({ length: 100 }, (_, i) => `// more noise ${i}`),
  ].join("\n");

  return { compressLog, systemPrompt, contextDump, retrieveSource };
}

export async function compareDemo(
  opts: { model?: string; turns?: number } = {},
): Promise<CompareResult[]> {
  const model = opts.model ?? "claude-sonnet-4";
  const { compressLog, systemPrompt, contextDump, retrieveSource } =
    demoFixtures();
  return [
    compareCompress(compressLog, { kind: "test", model }),
    compareCache(systemPrompt, { turns: opts.turns ?? 100, model }),
    compareContext(contextDump, { lines: 120, model }),
    await compareRetrieve({
      query: "authenticate",
      fileText: retrieveSource,
      filePath: "demo/auth.ts",
      contextLines: 15,
      model,
    }),
  ];
}

export function formatCompareResult(r: CompareResult): string {
  const lines = [
    `optima compare — ${r.scenario}`,
    "",
    `What: ${r.what}`,
    `Model: ${r.model}`,
    "",
    padRow("", "Tokens", "USD"),
    padRow("Without Optima", String(r.without.tokens), formatUsd(r.without.usd)),
    padRow("With Optima", String(r.withOptima.tokens), formatUsd(r.withOptima.usd)),
    padRow(
      "Saved",
      String(r.savedTokens),
      `${formatUsd(r.savedUsd)}  (−${r.savedPct.toFixed(1)}%)`,
    ),
    "",
    `Without: ${r.without.label}`,
    `With:    ${r.withOptima.label}`,
  ];
  if (r.details && Object.keys(r.details).length) {
    lines.push("", "Details:");
    for (const [k, v] of Object.entries(r.details)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  lines.push("", `Note: ${r.caveat}`);
  return lines.join("\n");
}

export function formatCompareResults(results: CompareResult[]): string {
  return results.map(formatCompareResult).join("\n\n---\n\n");
}

function padRow(a: string, b: string, c: string): string {
  return `${a.padEnd(16)} ${b.padStart(10)}  ${c}`;
}
