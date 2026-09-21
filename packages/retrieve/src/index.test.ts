import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { retrieve, retrieveInText } from "./index.js";

describe("@optima/retrieve", () => {
  it("extracts spans around query hits in text", async () => {
    const text = Array.from({ length: 200 }, (_, i) => {
      if (i === 100) return "export function loginUser() { return true; }";
      return `// filler line ${i}`;
    }).join("\n");
    const r = await retrieveInText(text, "loginUser", { contextLines: 5 });
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.context).toContain("loginUser");
    expect(r.spans[0]!.startLine).toBeLessThanOrEqual(101);
    expect(r.spans[0]!.endLine).toBeGreaterThanOrEqual(101);
  });

  it("retrieves from a mini tree with less tokens than full dump", async () => {
    const dir = await mkdtemp(join(tmpdir(), "optima-retrieve-"));
    try {
      await mkdir(join(dir, "src"));
      await writeFile(
        join(dir, "src", "auth.ts"),
        [
          "// auth module",
          ...Array.from({ length: 80 }, (_, i) => `const x${i} = ${i};`),
          "export function authenticate(token: string) { return token.length > 0; }",
          ...Array.from({ length: 80 }, (_, i) => `const y${i} = ${i};`),
        ].join("\n"),
        "utf8",
      );
      await writeFile(
        join(dir, "src", "noise.ts"),
        Array.from({ length: 300 }, (_, i) => `export const noise${i} = ${i};`).join(
          "\n",
        ),
        "utf8",
      );
      const r = await retrieve({
        root: dir,
        query: "authenticate",
        contextLines: 10,
        maxFiles: 50,
      });
      expect(r.hits.some((h) => h.matchText.includes("authenticate"))).toBe(true);
      expect(r.stats.retrievedTokens).toBeLessThan(r.stats.fullDumpTokens);
      expect(r.stats.savedPct).toBeGreaterThan(50);
      expect(r.context).toContain("authenticate");
      expect(r.context).not.toContain("noise299");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
