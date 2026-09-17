import { describe, expect, it } from "vitest";
import { analyzeSession, analyzeSessions, parseTranscriptJsonl } from "./index.js";

const sample = [
  JSON.stringify({
    role: "user",
    content: "<user_query>look around the codebase</user_query>",
  }),
  JSON.stringify({
    role: "assistant",
    content: "exploring",
    tool_calls: [
      { name: "Glob", arguments: { glob: "**/*" } },
      { name: "Read", arguments: { path: "node_modules/lodash/index.js" } },
      { name: "Read", arguments: { path: "package-lock.json" } },
    ],
  }),
  JSON.stringify({
    role: "user",
    content: "<user_query>look around the codebase please</user_query>",
  }),
].join("\n");

describe("parse + analyze", () => {
  it("parses jsonl and scores waste", () => {
    const session = parseTranscriptJsonl(sample, "/tmp/t.jsonl", Date.now());
    expect(session.turns.length).toBe(3);
    const findings = analyzeSession(session);
    const codes = findings.map((f) => f.code);
    expect(codes).toContain("broad_glob");
    expect(codes).toContain("noisy_reads");
    expect(codes).toContain("vague_prompt");
  });

  it("aggregates reports", () => {
    const session = parseTranscriptJsonl(sample, "/tmp/t.jsonl", Date.now());
    const report = analyzeSessions([session]);
    expect(report.sessionsAnalyzed).toBe(1);
    expect(report.tailoredRules.length).toBeGreaterThan(0);
    expect(report.wasteScore).toBeGreaterThan(0);
  });
});
