/**
 * Minimal example: meter usage + cache-aware message build + compress tool output.
 * Does not call a real LLM provider.
 */
import { TokenMeter, formatUsd } from "@ai-opt/core";
import { buildCacheableMessages, lintCachePrefix } from "@ai-opt/cache";
import { compressAuto } from "@ai-opt/compress";

const system = [
  "You are a production support agent.",
  "Follow org policy. Never invent refunds.",
  "Knowledge base excerpt:",
  "A".repeat(4000),
].join("\n");

const issues = lintCachePrefix(system);
if (issues.length) {
  console.warn("Cache lint:", issues);
}

const messages = buildCacheableMessages({
  system,
  toolsSchema: JSON.stringify({ tools: [{ name: "lookup_order" }] }),
  user: "Where is order 1234?",
  minCacheTokens: 500,
});

const meter = new TokenMeter("claude-sonnet-4", {
  softUsd: 0.01,
  hardUsd: 1,
});

meter.on((e) => {
  if (e.type === "usage") {
    console.log("turn cost", formatUsd(e.cost.totalUsd));
  }
});

// Simulate a provider response usage record
meter.record({
  inputTokens: 1200,
  outputTokens: 180,
  cacheReadTokens: 900,
  cacheWriteTokens: 300,
});

const noisyTool = [
  "✓ unit a",
  "✓ unit b",
  "✓ unit c",
  "FAIL refund_policy",
  "AssertionError: expected 200",
  "Tests: 1 failed, 3 passed",
].join("\n");

console.log("messages roles:", messages.map((m) => m.role));
console.log("compressed tool output:\n", compressAuto(noisyTool, "test").text);
console.log("meter snapshot:", meter.snapshot());
