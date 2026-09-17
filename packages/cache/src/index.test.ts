import { describe, expect, it } from "vitest";
import {
  buildCacheableMessages,
  emptyCacheMetrics,
  lintCachePrefix,
  updateCacheMetrics,
} from "./index.js";

describe("buildCacheableMessages", () => {
  it("marks cache when prefix is large enough", () => {
    const system = "x".repeat(5000);
    const msgs = buildCacheableMessages({
      system,
      user: "hello",
      minCacheTokens: 100,
    });
    const content = msgs[0]!.content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content.at(-1)?.cache_control?.type).toBe("ephemeral");
    }
  });

  it("skips cache mark below minimum", () => {
    const msgs = buildCacheableMessages({
      system: "short",
      user: "hi",
      minCacheTokens: 10_000,
    });
    const content = msgs[0]!.content as { cache_control?: unknown }[];
    expect(content[0]?.cache_control).toBeUndefined();
  });
});

describe("lintCachePrefix", () => {
  it("flags timestamps", () => {
    const issues = lintCachePrefix("run at 2026-09-17T10:00:00Z");
    expect(issues.some((i) => i.code === "timestamp_in_prefix")).toBe(true);
  });
});

describe("updateCacheMetrics", () => {
  it("computes hit rate", () => {
    let m = emptyCacheMetrics();
    m = updateCacheMetrics(m, { cacheWriteTokens: 100 });
    m = updateCacheMetrics(m, { cacheReadTokens: 900 });
    expect(m.hitRate).toBe(0.9);
  });
});
