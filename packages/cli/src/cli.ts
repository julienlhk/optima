import { estimateTokens, formatUsd, getModelPricing, computeCost } from "@optima/core";
import { classify, exportTaxonomyDocument } from "@optima/classify";
import { compressAuto } from "@optima/compress";
import { buildCacheableMessages, lintCachePrefix } from "@optima/cache";
import {
  analyzeSessions,
  discoverSessions,
  parseTranscriptJsonl,
  findingsToMdcSection,
} from "@optima/analyze";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { doctor, initProject, resolveProject, type Host } from "./install.js";

function printHelp(): void {
  console.log(`optima — AI & token optimization CLI

Usage:
  optima init [--host cursor|claude|codex|windsurf|all]
  optima install [--host ...]     (alias of init)
  optima doctor
  optima analyze [--days N] [--limit N] [--json] [--apply-rules]
  optima classify <file|->
  optima estimate --file <path> [--model id]
  optima bench
  optima taxonomy
  optima help
`);
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const cmd = args[0] ?? "help";
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 1; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd, flags, positional };
}

export async function run(argv = process.argv): Promise<number> {
  const { cmd, flags, positional } = parseArgs(argv);
  const project = resolveProject();

  switch (cmd) {
    case "help":
    case "-h":
    case "--help":
      printHelp();
      return 0;

    case "init":
    case "install": {
      const host = String(flags.host ?? "all") as Host;
      const actions = await initProject(project, [host]);
      console.log(`Initialized Optima in ${project}`);
      for (const a of actions) console.log(`  • ${a}`);
      return 0;
    }

    case "doctor": {
      const checks = await doctor(project);
      let failed = 0;
      for (const c of checks) {
        const mark = c.ok ? "ok" : "MISSING";
        console.log(`[${mark}] ${c.check} — ${c.detail}`);
        if (!c.ok) failed += 1;
      }
      return failed === 0 ? 0 : 1;
    }

    case "analyze": {
      const days = Number(flags.days ?? 30);
      const limit = Number(flags.limit ?? 20);
      const sessions = await discoverSessions({ days, limit });
      const report = analyzeSessions(sessions);
      if (flags.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(
          `Sessions: ${report.sessionsAnalyzed} | Est. tokens: ${report.totalEstimatedTokens} | Waste score: ${report.wasteScore}`,
        );
        console.log("Findings by code:", report.aggregateByCode);
        if (report.tailoredRules.length) {
          console.log("\nTailored rules:");
          for (const r of report.tailoredRules) console.log(`  - ${r}`);
        }
      }
      if (flags["apply-rules"] && report.tailoredRules.length) {
        const section = findingsToMdcSection(report.tailoredRules);
        const dest = join(project, ".cursor/rules/optima-tailored.mdc");
        await mkdir(join(project, ".cursor/rules"), { recursive: true });
        await writeFile(
          dest,
          `---\ndescription: Optima tailored rules from transcript analysis\nalwaysApply: true\n---\n\n${section}`,
          "utf8",
        );
        console.log(`Wrote ${dest}`);
      }
      return 0;
    }

    case "classify": {
      let text = "";
      const target = positional[0] ?? "-";
      if (target === "-") {
        text = await readStdin();
      } else {
        text = await readFile(target, "utf8");
      }
      const result = classify({ text });
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    case "estimate": {
      const file = String(flags.file ?? "");
      if (!file) {
        console.error("Usage: optima estimate --file <path> [--model id]");
        return 1;
      }
      const text = await readFile(file, "utf8");
      const tokens = estimateTokens(text);
      const model = String(flags.model ?? "claude-sonnet-4");
      const pricing = getModelPricing(model);
      if (!pricing) {
        console.error(`Unknown model: ${model}`);
        return 1;
      }
      const cost = computeCost(
        { inputTokens: tokens, outputTokens: 0 },
        pricing,
      );
      console.log(
        JSON.stringify(
          {
            file,
            model,
            estimatedInputTokens: tokens,
            estimatedInputCostUsd: cost.inputUsd,
            formatted: formatUsd(cost.inputUsd),
          },
          null,
          2,
        ),
      );
      return 0;
    }

    case "bench": {
      const sampleJson = JSON.stringify(
        Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          empty: "",
          nested: { a: 1, b: null },
        })),
      );
      const compressed = compressAuto(sampleJson, "json");
      const cacheMsgs = buildCacheableMessages({
        system: "You are a careful coding agent.\n".repeat(80),
        toolsSchema: '{"tools":[]}',
        user: "summarize",
        minCacheTokens: 100,
      });
      const lint = lintCachePrefix("run at 2026-01-01T00:00:00Z");
      const taxonomy = exportTaxonomyDocument();
      console.log(
        JSON.stringify(
          {
            compressRatio: Number(compressed.ratio.toFixed(3)),
            compressMethod: compressed.method,
            cacheMessages: cacheMsgs.length,
            lintIssues: lint.length,
            taxonomyCount: taxonomy.techniques.length,
            note: "Honest micro-bench — not a claimed production savings figure.",
          },
          null,
          2,
        ),
      );
      return 0;
    }

    case "taxonomy": {
      console.log(JSON.stringify(exportTaxonomyDocument(), null, 2));
      return 0;
    }

    case "parse-fixture": {
      // internal/test helper
      const file = positional[0];
      if (!file) return 1;
      const content = await readFile(file, "utf8");
      const session = parseTranscriptJsonl(content, file, Date.now());
      console.log(JSON.stringify(analyzeSessions([session]), null, 2));
      return 0;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      printHelp();
      return 1;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
