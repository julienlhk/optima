import { describe, expect, it } from "vitest";
import {
  compareCompress,
  compareCache,
  compareContext,
  compareRetrieve,
  compareDemo,
  formatCompareResult,
} from "./compare.js";

describe("compare", () => {
  it("compresses test logs and reports savings", () => {
    const log = [
      "Test Suites: 1 failed, 5 passed",
      ...Array.from({ length: 20 }, (_, i) => `PASS ok${i}.test.ts`),
      "FAIL bad.test.ts",
      "  ● boom",
    ].join("\n");
    const r = compareCompress(log, { kind: "test" });
    expect(r.scenario).toBe("compress");
    expect(r.withOptima.tokens).toBeLessThan(r.without.tokens);
    expect(r.savedPct).toBeGreaterThan(0);
    expect(formatCompareResult(r)).toContain("Saved");
  });

  it("shows cache USD savings across turns", () => {
    const system = "stable policy\n".repeat(200);
    const r = compareCache(system, { turns: 50 });
    expect(r.withOptima.usd).toBeLessThan(r.without.usd);
    expect(r.savedUsd).toBeGreaterThan(0);
  });

  it("context line budget reduces tokens", () => {
    const text = Array.from({ length: 500 }, (_, i) => `line-${i}`).join("\n");
    const r = compareContext(text, { lines: 50 });
    expect(r.withOptima.tokens).toBeLessThan(r.without.tokens);
  });

  it("retrieve keeps hit neighborhood with fewer tokens than full file", async () => {
    const text = [
      ...Array.from({ length: 150 }, (_, i) => `// noise ${i}`),
      "export function paymentRefund() { return 1; }",
      ...Array.from({ length: 150 }, (_, i) => `// tail ${i}`),
    ].join("\n");
    const r = await compareRetrieve({
      query: "paymentRefund",
      fileText: text,
      filePath: "pay.ts",
      contextLines: 8,
    });
    expect(r.scenario).toBe("retrieve");
    expect(r.withOptima.tokens).toBeLessThan(r.without.tokens);
    expect(r.details?.signalKept).toBeTruthy();
    expect(r.savedPct).toBeGreaterThan(70);
  });

  it("demo returns four scenarios including retrieve", async () => {
    const rows = await compareDemo();
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.scenario)).toEqual([
      "compress",
      "cache",
      "context",
      "retrieve",
    ]);
  });
});
