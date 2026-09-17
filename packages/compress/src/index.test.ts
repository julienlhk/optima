import { describe, expect, it } from "vitest";
import {
  compressAuto,
  compressJson,
  compressTestOutput,
  isSacredPath,
  pruneEmpty,
} from "./index.js";

describe("pruneEmpty", () => {
  it("drops empty fields", () => {
    expect(pruneEmpty({ a: 1, b: "", c: null, d: { e: undefined } })).toEqual({
      a: 1,
    });
  });
});

describe("compressJson", () => {
  it("tables homogeneous arrays", () => {
    const r = compressJson(
      JSON.stringify([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ]),
    );
    expect(r.method).toBe("json-table");
    expect(r.text).toContain("id | name");
    expect(r.ratio).toBeLessThan(1);
  });
});

describe("compressTestOutput", () => {
  it("keeps failures and suppresses passes", () => {
    const input = ["✓ ok one", "✓ ok two", "FAIL something", "Tests: 1 failed"].join(
      "\n",
    );
    const r = compressTestOutput(input);
    expect(r.text).toContain("FAIL");
    expect(r.text).toContain("suppressed 2");
    expect(r.text).not.toContain("✓ ok one");
  });
});

describe("compressAuto + sacred", () => {
  it("detects sacred paths", () => {
    expect(isSacredPath("src/app.ts")).toBe(true);
    expect(isSacredPath("out.log")).toBe(false);
  });
  it("collapses whitespace", () => {
    const r = compressAuto("a\n\n\n\nb");
    expect(r.text).toBe("a\n\nb");
  });
});
