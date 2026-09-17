import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initProject, upsertMarkedBlock, doctor } from "./install.js";

const workspaceTmp = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.tmp-tests",
);

describe("install helpers", () => {
  it("upserts marked blocks idempotently", async () => {
    await mkdir(workspaceTmp, { recursive: true });
    const dir = await mkdtemp(join(workspaceTmp, "ai-opt-"));
    const file = join(dir, "AGENTS.md");
    await upsertMarkedBlock(file, "one");
    await upsertMarkedBlock(file, "two");
    const text = await readFile(file, "utf8");
    expect(text).toContain("two");
    expect(text).not.toContain("one");
    expect(text.match(/ai-opt:begin/g)?.length).toBe(1);
    await rm(dir, { recursive: true, force: true });
  });

  it("inits a project with templates", async () => {
    await mkdir(workspaceTmp, { recursive: true });
    const dir = await mkdtemp(join(workspaceTmp, "ai-opt-proj-"));
    const actions = await initProject(dir, ["all"]);
    expect(actions.length).toBeGreaterThan(3);
    const checks = await doctor(dir);
    const required = checks.filter((c) =>
      ["AGENTS.md", "AI_OPT_RUNTIME.md", ".aioptignore"].includes(c.check),
    );
    expect(required.every((c) => c.ok)).toBe(true);
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("ai-opt:begin");
    await rm(dir, { recursive: true, force: true });
  });
});
