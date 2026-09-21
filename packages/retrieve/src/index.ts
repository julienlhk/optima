/**
 * Local retrieval: walk → search → extract spans.
 * No embeddings, no network — deterministic index-style fetch for agents.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";
import { estimateTokens } from "@optima/core";

export const DEFAULT_IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  ".tmp-tests",
]);

export const DEFAULT_IGNORE_FILE_NAMES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
]);

const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".rb",
  ".php",
  ".md",
  ".mdx",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".scss",
  ".html",
  ".vue",
  ".svelte",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".txt",
]);

export type RetrieveHit = {
  path: string;
  line: number;
  column: number;
  matchText: string;
  score: number;
};

export type RetrieveSpan = {
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  hitLines: number[];
  score: number;
};

export type RetrieveOptions = {
  root: string;
  query: string;
  /** Case-insensitive substring search (default). Set regex=true for RegExp. */
  regex?: boolean;
  maxFiles?: number;
  maxHits?: number;
  contextLines?: number;
  maxFileBytes?: number;
  ignoreDirNames?: Set<string>;
  ignoreFileNames?: Set<string>;
  extensions?: Set<string>;
};

export type RetrieveResult = {
  query: string;
  root: string;
  filesScanned: number;
  hits: RetrieveHit[];
  spans: RetrieveSpan[];
  /** Concatenated spans ready for a model prompt */
  context: string;
  stats: {
    fullDumpTokens: number;
    retrievedTokens: number;
    savedTokens: number;
    savedPct: number;
    filesInDump: number;
  };
};

function shouldSkipDir(name: string, ignore: Set<string>): boolean {
  if (ignore.has(name)) return true;
  if (name.startsWith(".") && name !== ".github" && name !== ".cursor") return true;
  return false;
}

async function walkFiles(
  dir: string,
  root: string,
  opts: {
    ignoreDirNames: Set<string>;
    ignoreFileNames: Set<string>;
    extensions: Set<string>;
    maxFiles: number;
    out: string[];
  },
): Promise<void> {
  if (opts.out.length >= opts.maxFiles) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (opts.out.length >= opts.maxFiles) return;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (shouldSkipDir(ent.name, opts.ignoreDirNames)) continue;
      await walkFiles(full, root, opts);
      continue;
    }
    if (!ent.isFile()) continue;
    if (opts.ignoreFileNames.has(ent.name)) continue;
    const ext = extname(ent.name).toLowerCase();
    if (ext && !opts.extensions.has(ext)) continue;
    // extensionless: allow a few known names
    if (!ext && !["Dockerfile", "Makefile", "AGENTS.md", "CLAUDE.md"].includes(ent.name)) {
      if (!/^[A-Z0-9_.-]+$/.test(ent.name)) continue;
    }
    opts.out.push(full);
  }
}

function buildMatcher(query: string, regex: boolean): RegExp {
  if (regex) return new RegExp(query, "gi");
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "gi");
}

function scoreHit(path: string, lineText: string, query: string): number {
  let score = 10;
  const base = basename(path).toLowerCase();
  const q = query.toLowerCase();
  if (base.includes(q)) score += 20;
  if (lineText.toLowerCase().includes(`function ${q}`) || lineText.includes(`${q}(`))
    score += 15;
  if (/\b(export|class|interface|type|def|fn)\b/.test(lineText)) score += 8;
  if (extname(path) === ".md") score -= 2;
  return score;
}

/**
 * Search a directory tree and return ranked hits + merged line spans.
 * Also reports tokens for "dump all scanned files" vs "retrieved spans only".
 */
export async function retrieve(opts: RetrieveOptions): Promise<RetrieveResult> {
  const ignoreDirNames = opts.ignoreDirNames ?? DEFAULT_IGNORE_DIR_NAMES;
  const ignoreFileNames = opts.ignoreFileNames ?? DEFAULT_IGNORE_FILE_NAMES;
  const extensions = opts.extensions ?? TEXT_EXTS;
  const maxFiles = opts.maxFiles ?? 400;
  const maxHits = opts.maxHits ?? 40;
  const contextLines = opts.contextLines ?? 20;
  const maxFileBytes = opts.maxFileBytes ?? 512_000;
  const regex = Boolean(opts.regex);

  const files: string[] = [];
  await walkFiles(opts.root, opts.root, {
    ignoreDirNames,
    ignoreFileNames,
    extensions,
    maxFiles,
    out: files,
  });

  const matcher = buildMatcher(opts.query, regex);
  const hits: RetrieveHit[] = [];
  const fileContents = new Map<string, string>();
  let fullDumpTokens = 0;

  for (const file of files) {
    let st;
    try {
      st = await stat(file);
    } catch {
      continue;
    }
    if (st.size > maxFileBytes) continue;
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }
    // skip obvious binary
    if (text.includes("\u0000")) continue;
    fileContents.set(file, text);
    fullDumpTokens += estimateTokens(text);

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]!;
      matcher.lastIndex = 0;
      const m = matcher.exec(lineText);
      if (!m) continue;
      const rel = relative(opts.root, file) || file;
      hits.push({
        path: rel,
        line: i + 1,
        column: (m.index ?? 0) + 1,
        matchText: lineText.trim().slice(0, 200),
        score: scoreHit(rel, lineText, opts.query),
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || a.line - b.line);
  const topHits = hits.slice(0, maxHits);

  // Merge overlapping spans per file
  const byFile = new Map<string, number[]>();
  for (const h of topHits) {
    const abs = join(opts.root, h.path);
    const list = byFile.get(abs) ?? [];
    list.push(h.line);
    byFile.set(abs, list);
  }

  const spans: RetrieveSpan[] = [];
  for (const [abs, hitLines] of byFile) {
    const text = fileContents.get(abs);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    const ranges: { start: number; end: number; hits: number[] }[] = [];
    const sorted = [...new Set(hitLines)].sort((a, b) => a - b);
    for (const ln of sorted) {
      const start = Math.max(1, ln - contextLines);
      const end = Math.min(lines.length, ln + contextLines);
      const last = ranges[ranges.length - 1];
      if (last && start <= last.end + 1) {
        last.end = Math.max(last.end, end);
        last.hits.push(ln);
      } else {
        ranges.push({ start, end, hits: [ln] });
      }
    }
    const rel = relative(opts.root, abs) || abs;
    const fileHits = topHits.filter((h) => h.path === rel);
    const bestScore = fileHits.reduce((m, h) => Math.max(m, h.score), 0);
    for (const r of ranges) {
      const chunk = lines.slice(r.start - 1, r.end).join("\n");
      spans.push({
        path: rel,
        startLine: r.start,
        endLine: r.end,
        text: chunk,
        hitLines: r.hits,
        score: bestScore,
      });
    }
  }

  spans.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const context = spans
    .map(
      (s) =>
        `--- ${s.path}:${s.startLine}-${s.endLine} (hits: ${s.hitLines.join(",")}) ---\n${s.text}`,
    )
    .join("\n\n");

  const retrievedTokens = estimateTokens(context);
  const savedTokens = Math.max(0, fullDumpTokens - retrievedTokens);
  const savedPct = fullDumpTokens > 0 ? (savedTokens / fullDumpTokens) * 100 : 0;

  return {
    query: opts.query,
    root: opts.root,
    filesScanned: fileContents.size,
    hits: topHits,
    spans,
    context,
    stats: {
      fullDumpTokens,
      retrievedTokens,
      savedTokens,
      savedPct,
      filesInDump: fileContents.size,
    },
  };
}

/** Retrieve within a single file (compare / unit tests). */
export async function retrieveInText(
  text: string,
  query: string,
  opts: { path?: string; contextLines?: number; regex?: boolean; maxHits?: number } = {},
): Promise<{ hits: RetrieveHit[]; spans: RetrieveSpan[]; context: string }> {
  const path = opts.path ?? "input.txt";
  const contextLines = opts.contextLines ?? 20;
  const matcher = buildMatcher(query, Boolean(opts.regex));
  const lines = text.split(/\r?\n/);
  const hits: RetrieveHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i]!;
    matcher.lastIndex = 0;
    const m = matcher.exec(lineText);
    if (!m) continue;
    hits.push({
      path,
      line: i + 1,
      column: (m.index ?? 0) + 1,
      matchText: lineText.trim().slice(0, 200),
      score: scoreHit(path, lineText, query),
    });
  }
  hits.sort((a, b) => b.score - a.score || a.line - b.line);
  const top = hits.slice(0, opts.maxHits ?? 20);
  const hitLines = top.map((h) => h.line);
  const ranges: { start: number; end: number; hits: number[] }[] = [];
  for (const ln of [...new Set(hitLines)].sort((a, b) => a - b)) {
    const start = Math.max(1, ln - contextLines);
    const end = Math.min(lines.length, ln + contextLines);
    const last = ranges[ranges.length - 1];
    if (last && start <= last.end + 1) {
      last.end = Math.max(last.end, end);
      last.hits.push(ln);
    } else {
      ranges.push({ start, end, hits: [ln] });
    }
  }
  const spans: RetrieveSpan[] = ranges.map((r) => ({
    path,
    startLine: r.start,
    endLine: r.end,
    text: lines.slice(r.start - 1, r.end).join("\n"),
    hitLines: r.hits,
    score: top[0]?.score ?? 0,
  }));
  const context = spans
    .map(
      (s) =>
        `--- ${s.path}:${s.startLine}-${s.endLine} (hits: ${s.hitLines.join(",")}) ---\n${s.text}`,
    )
    .join("\n\n");
  return { hits: top, spans, context };
}
