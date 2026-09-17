import { estimateTokens } from "@ai-opt/core";

export type CacheControl = { type: "ephemeral"; ttl?: "5m" | "1h" };

export interface CacheableBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | CacheableBlock[];
}

export interface BuildCacheableOptions {
  system: string;
  toolsSchema?: string;
  staticReference?: string;
  user: string;
  /** Mark the last stable block with cache_control. */
  enableCache?: boolean;
  ttl?: "5m" | "1h";
  /** Minimum estimated tokens before marking cache (provider floors). */
  minCacheTokens?: number;
}

export interface CacheMetrics {
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  hitRate: number;
}

export function buildCacheableMessages(
  opts: BuildCacheableOptions,
): ChatMessage[] {
  const enable = opts.enableCache !== false;
  const ttl = opts.ttl ?? "5m";
  const minTokens = opts.minCacheTokens ?? 1024;

  const stableParts = [opts.system, opts.toolsSchema, opts.staticReference]
    .filter(Boolean)
    .join("\n\n");
  const stableTokens = estimateTokens(stableParts);
  const mark = enable && stableTokens >= minTokens;

  const systemBlocks: CacheableBlock[] = [];
  systemBlocks.push({ type: "text", text: opts.system });
  if (opts.toolsSchema) {
    systemBlocks.push({ type: "text", text: opts.toolsSchema });
  }
  if (opts.staticReference) {
    systemBlocks.push({ type: "text", text: opts.staticReference });
  }
  if (mark && systemBlocks.length > 0) {
    systemBlocks[systemBlocks.length - 1]!.cache_control = {
      type: "ephemeral",
      ttl,
    };
  }

  return [
    { role: "system", content: systemBlocks },
    { role: "user", content: opts.user },
  ];
}

export interface LintIssue {
  code: string;
  severity: "warn" | "error";
  message: string;
}

/** Detect common prompt cache busting patterns in stable prefix text. */
export function lintCachePrefix(stablePrefix: string): LintIssue[] {
  const issues: LintIssue[] = [];
  if (/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stablePrefix)) {
    issues.push({
      code: "timestamp_in_prefix",
      severity: "error",
      message:
        "ISO timestamps in the stable prefix bust prompt caches. Move them to the user turn.",
    });
  }
  if (/\b(Date\.now\(\)|new Date\(\)|uuid|Math\.random)\b/i.test(stablePrefix)) {
    issues.push({
      code: "dynamic_value_in_prefix",
      severity: "error",
      message: "Dynamic values in the stable prefix prevent cache hits.",
    });
  }
  if (/request[_-]?id|session[_-]?id\s*[:=]/i.test(stablePrefix)) {
    issues.push({
      code: "request_id_in_prefix",
      severity: "warn",
      message: "Per-request IDs in the prefix reduce cache hit rate.",
    });
  }
  return issues;
}

export function updateCacheMetrics(
  prev: CacheMetrics,
  delta: {
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    inputTokens?: number;
  },
): CacheMetrics {
  const cacheReadTokens = prev.cacheReadTokens + (delta.cacheReadTokens ?? 0);
  const cacheWriteTokens =
    prev.cacheWriteTokens + (delta.cacheWriteTokens ?? 0);
  const inputTokens = prev.inputTokens + (delta.inputTokens ?? 0);
  const denom = cacheReadTokens + cacheWriteTokens;
  return {
    cacheReadTokens,
    cacheWriteTokens,
    inputTokens,
    hitRate: denom === 0 ? 0 : cacheReadTokens / denom,
  };
}

export function emptyCacheMetrics(): CacheMetrics {
  return {
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    inputTokens: 0,
    hitRate: 0,
  };
}
