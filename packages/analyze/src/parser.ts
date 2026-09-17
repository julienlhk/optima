import { estimateTokens } from "@ai-opt/core";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Session, ToolCall, Turn } from "./models.js";

const MAX_FILE_BYTES = 32 * 1024 * 1024;

function extractUserQuery(text: string): string {
  const m = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  return m ? m[1]!.trim() : text;
}

function parseToolCalls(obj: Record<string, unknown>): ToolCall[] {
  const tools: ToolCall[] = [];
  const candidates =
    (obj.tool_calls as unknown[]) ||
    (obj.toolCalls as unknown[]) ||
    (obj.tools as unknown[]) ||
    [];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const t = c as Record<string, unknown>;
    const name = String(t.name ?? t.toolName ?? t.tool ?? "unknown");
    const args = (t.arguments ?? t.args ?? t.input ?? {}) as Record<
      string,
      unknown
    >;
    tools.push({ name, args });
  }
  // Cursor-style tool_use embedded in content
  const content = obj.content;
  if (typeof content === "string") {
    const re = /toolName["']?\s*[:=]\s*["'](\w+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      tools.push({ name: m[1]!, args: {} });
    }
  }
  return tools;
}

export function parseTranscriptJsonl(content: string, path: string, mtimeMs: number): Session {
  const turns: Turn[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      const roleRaw = String(obj.role ?? obj.type ?? "unknown").toLowerCase();
      let role: Turn["role"] = "unknown";
      if (roleRaw.includes("user")) role = "user";
      else if (roleRaw.includes("assistant")) role = "assistant";
      else if (roleRaw.includes("tool")) role = "tool";
      else if (roleRaw.includes("system")) role = "system";

      let text = "";
      if (typeof obj.text === "string") text = obj.text;
      else if (typeof obj.content === "string") text = obj.content;
      else if (typeof obj.message === "string") text = obj.message;
      else if (obj.message && typeof obj.message === "object") {
        const msg = obj.message as Record<string, unknown>;
        if (typeof msg.content === "string") text = msg.content;
      }

      if (role === "user") text = extractUserQuery(text);
      const tools = parseToolCalls(obj);
      const estimatedTokens = estimateTokens(text) + tools.length * 20;
      turns.push({ role, text, tools, estimatedTokens });
    } catch {
      // skip bad lines
    }
  }
  const id = path.split(/[\\/]/).slice(-1)[0]!.replace(/\.jsonl$/, "");
  return { id, path, mtimeMs, turns };
}

export async function discoverCursorProjects(
  cursorRoot = join(homedir(), ".cursor", "projects"),
): Promise<string[]> {
  try {
    const entries = await readdir(cursorRoot, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => join(cursorRoot, e.name));
  } catch {
    return [];
  }
}

export interface DiscoverOptions {
  days?: number;
  limit?: number;
  cursorRoot?: string;
  projectSlug?: string;
}

export async function discoverSessions(
  opts: DiscoverOptions = {},
): Promise<Session[]> {
  const days = opts.days ?? 30;
  const limit = opts.limit ?? 20;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const projects = await discoverCursorProjects(opts.cursorRoot);
  const files: { path: string; mtimeMs: number }[] = [];

  for (const project of projects) {
    if (opts.projectSlug && !project.includes(opts.projectSlug)) continue;
    const dir = join(project, "agent-transcripts");
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith(".jsonl")) continue;
      const path = join(dir, name);
      try {
        const st = await stat(path);
        if (st.size > MAX_FILE_BYTES) continue;
        if (st.mtimeMs < cutoff) continue;
        files.push({ path, mtimeMs: st.mtimeMs });
      } catch {
        // skip
      }
    }
  }

  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const selected = files.slice(0, limit);
  const sessions: Session[] = [];
  for (const f of selected) {
    const content = await readFile(f.path, "utf8");
    sessions.push(parseTranscriptJsonl(content, f.path, f.mtimeMs));
  }
  return sessions;
}
