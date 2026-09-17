import type { OptimizationTechnique, WasteFinding } from "@optima/core";
import { TAXONOMY, getTechnique } from "./taxonomy.js";

export interface ClassifyInput {
  text?: string;
  findings?: WasteFinding[];
  signals?: {
    broadGlobs?: boolean;
    longSession?: boolean;
    verboseTools?: boolean;
    usesCaching?: boolean;
    multiModel?: boolean;
    writesCode?: boolean;
  };
}

export interface ClassificationResult {
  recommended: OptimizationTechnique[];
  playbook: string[];
  layers: Record<string, number>;
}

const KEYWORD_MAP: Array<{ re: RegExp; ids: string[] }> = [
  { re: /node_modules|lockfile|\.gitignore|ignore/i, ids: ["ctx.ignore_boundaries"] },
  { re: /grep|symbol|skeleton|section read|surgical/i, ids: ["ctx.surgical_retrieval"] },
  { re: /skill|progressive|always.?on/i, ids: ["ctx.progressive_disclosure"] },
  { re: /compact|summariz|context window|75%/i, ids: ["ctx.compaction"] },
  { re: /\[PLAN\]|\[GIT\]|zone|caveman/i, ids: ["out.zone_routing"] },
  { re: /diet|ultra|verbosity|telegraph/i, ids: ["out.diet_levels"] },
  { re: /pytest|npm test|docker logs|compress output/i, ids: ["out.tool_filters"] },
  { re: /cache_control|prompt cache|stable prefix/i, ids: ["cache.stable_prefix", "cache.breakpoints"] },
  { re: /ttl|cache hit/i, ids: ["cache.ttl_economics"] },
  { re: /haiku|mini|flash|sub-?agent|rout(e|ing)/i, ids: ["route.cheap_explore", "route.task_class"] },
  { re: /batch tools|minimize turns|fewer turns/i, ids: ["sess.turn_minimize", "sess.tool_batching"] },
  { re: /budget|finops|cost|meter/i, ids: ["finops.budgets", "finops.cost_models"] },
  { re: /waste|transcript|retry loop/i, ids: ["finops.waste_heuristics"] },
];

function uniqTechniques(ids: string[]): OptimizationTechnique[] {
  const seen = new Set<string>();
  const out: OptimizationTechnique[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const t = getTechnique(id);
    if (t) out.push(t);
  }
  return out;
}

export function classify(input: ClassifyInput): ClassificationResult {
  const ids: string[] = ["qual.sacred_zone"];

  if (input.text) {
    for (const { re, ids: mapped } of KEYWORD_MAP) {
      if (re.test(input.text)) ids.push(...mapped);
    }
  }

  for (const f of input.findings ?? []) {
    ids.push(...f.techniqueIds);
  }

  const s = input.signals ?? {};
  if (s.broadGlobs) ids.push("ctx.surgical_retrieval", "ctx.ignore_boundaries");
  if (s.longSession) ids.push("ctx.compaction", "sess.turn_minimize");
  if (s.verboseTools) ids.push("out.tool_filters");
  if (s.usesCaching) ids.push("cache.stable_prefix", "cache.breakpoints");
  if (s.multiModel) ids.push("route.cheap_explore", "route.task_class");
  if (s.writesCode) ids.push("qual.sacred_zone", "qual.critical_tests");

  // Default baseline playbook for coding agents
  if (ids.length <= 1) {
    ids.push(
      "ctx.ignore_boundaries",
      "out.diet_levels",
      "out.zone_routing",
      "sess.tool_batching",
      "finops.waste_heuristics",
    );
  }

  const recommended = uniqTechniques(ids);
  const layers: Record<string, number> = {};
  for (const t of recommended) {
    layers[t.layer] = (layers[t.layer] ?? 0) + 1;
  }

  const playbook = recommended.map(
    (t) => `[${t.layer}] ${t.name}: ${t.summary}`,
  );

  return { recommended, playbook, layers };
}

export function classifyWasteCodes(codes: string[]): ClassificationResult {
  const findings: WasteFinding[] = codes.map((code) => ({
    code,
    severity: "warn",
    title: code,
    detail: code,
    techniqueIds: wasteCodeToTechniques(code),
    score: 1,
  }));
  return classify({ findings });
}

function wasteCodeToTechniques(code: string): string[] {
  const map: Record<string, string[]> = {
    broad_glob: ["ctx.surgical_retrieval", "ctx.ignore_boundaries"],
    noisy_reads: ["ctx.surgical_retrieval"],
    long_session: ["ctx.compaction", "sess.turn_minimize"],
    retry_loop: ["sess.turn_minimize"],
    thin_prompt_heavy_explore: ["ctx.surgical_retrieval", "sess.tool_batching"],
    runaway_tools: ["sess.tool_batching", "sess.subagent_bounds"],
    vague_prompt: ["out.diet_levels", "sess.turn_minimize"],
  };
  return map[code] ?? ["finops.waste_heuristics"];
}

export function allTechniques(): OptimizationTechnique[] {
  return TAXONOMY;
}
