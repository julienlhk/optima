import { describe, expect, it } from "vitest";
import {
  classify,
  exportTaxonomyDocument,
  getTechnique,
  techniquesByLayer,
} from "./index.js";

describe("taxonomy", () => {
  it("has all seven layers", () => {
    const layers = new Set(exportTaxonomyDocument().techniques.map((t) => t.layer));
    expect(layers.size).toBe(7);
  });

  it("looks up techniques", () => {
    expect(getTechnique("cache.stable_prefix")?.effort).toBe("medium");
    expect(techniquesByLayer("quality_floors").length).toBeGreaterThan(0);
  });
});

describe("classify", () => {
  it("recommends cache techniques from text", () => {
    const r = classify({ text: "enable cache_control and stable prefix" });
    expect(r.recommended.some((t) => t.id === "cache.stable_prefix")).toBe(true);
  });

  it("uses waste findings", () => {
    const r = classify({
      findings: [
        {
          code: "broad_glob",
          severity: "warn",
          title: "Broad glob",
          detail: "**/*",
          techniqueIds: ["ctx.surgical_retrieval"],
          score: 5,
        },
      ],
    });
    expect(r.playbook.length).toBeGreaterThan(0);
    expect(r.recommended.some((t) => t.id === "ctx.surgical_retrieval")).toBe(
      true,
    );
  });
});
