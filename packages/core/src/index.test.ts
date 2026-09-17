import { describe, expect, it } from "vitest";
import {
  Budget,
  TokenMeter,
  computeCost,
  estimateTokens,
  getModelPricing,
  resolveZone,
} from "./index.js";

describe("estimateTokens", () => {
  it("uses chars/4 heuristic", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("pricing", () => {
  it("loads default models", () => {
    const p = getModelPricing("claude-sonnet-4");
    expect(p?.provider).toBe("anthropic");
    expect(p?.cacheReadPerMTok).toBe(0.3);
  });

  it("computes cache-aware cost", () => {
    const pricing = getModelPricing("claude-sonnet-4")!;
    const cost = computeCost(
      {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      pricing,
    );
    expect(cost.inputUsd).toBe(3);
    expect(cost.totalUsd).toBe(3);
  });
});

describe("TokenMeter", () => {
  it("tracks soft and hard limits", () => {
    const events: string[] = [];
    const meter = new TokenMeter("claude-haiku-4", {
      softTokens: 100,
      hardTokens: 200,
    });
    meter.on((e) => events.push(e.type));
    meter.record({ inputTokens: 120, outputTokens: 0 });
    expect(events).toContain("soft_limit");
    meter.record({ inputTokens: 100, outputTokens: 0 });
    expect(events).toContain("hard_limit");
    expect(meter.snapshot().withinHardLimit).toBe(false);
  });
});

describe("Budget", () => {
  it("reports exhausted after hard limit", () => {
    const b = new Budget("gpt-4.1-mini", { hardUsd: 0.000001 });
    b.meter.record({ inputTokens: 1_000_000, outputTokens: 0 });
    expect(b.exhausted).toBe(true);
  });
});

describe("resolveZone", () => {
  it("prioritizes sacred writes", () => {
    expect(resolveZone({ writesCodeOrDocs: true, text: "[GIT] status" })).toBe(
      0,
    );
  });
  it("maps tags", () => {
    expect(resolveZone({ text: "[PLAN] redesign auth" })).toBe(1);
    expect(resolveZone({ text: "[GIT] status" })).toBe(3);
  });
});
