export interface CompressResult {
  text: string;
  originalChars: number;
  compressedChars: number;
  ratio: number;
  method: string;
}

function result(
  original: string,
  compressed: string,
  method: string,
): CompressResult {
  return {
    text: compressed,
    originalChars: original.length,
    compressedChars: compressed.length,
    ratio: original.length === 0 ? 1 : compressed.length / original.length,
    method,
  };
}

/** Remove null/undefined/empty-string fields recursively. */
export function pruneEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneEmpty).filter((v) => v !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined || v === "") continue;
      const pruned = pruneEmpty(v);
      if (
        pruned &&
        typeof pruned === "object" &&
        !Array.isArray(pruned) &&
        Object.keys(pruned as object).length === 0
      ) {
        continue;
      }
      out[k] = pruned;
    }
    return out;
  }
  return value;
}

/**
 * Convert an array of homogeneous objects into a markdown/CSV-ish table.
 * Falls back to JSON if shapes diverge.
 */
export function jsonArrayToTable(data: unknown[]): CompressResult {
  const original = JSON.stringify(data);
  if (data.length === 0) return result(original, "[]", "json-table");
  if (!data.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    const pruned = JSON.stringify(pruneEmpty(data));
    return result(original, pruned, "prune-empty");
  }
  const rows = data as Record<string, unknown>[];
  const keys = Object.keys(rows[0]!);
  const homogeneous = rows.every((r) => Object.keys(r).every((k) => keys.includes(k)));
  if (!homogeneous) {
    const pruned = JSON.stringify(pruneEmpty(data));
    return result(original, pruned, "prune-empty");
  }
  const header = keys.join(" | ");
  const sep = keys.map(() => "---").join(" | ");
  const body = rows
    .map((r) => keys.map((k) => stringifyCell(r[k])).join(" | "))
    .join("\n");
  const table = `${header}\n${sep}\n${body}`;
  return result(original, table, "json-table");
}

function stringifyCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function compressJson(text: string): CompressResult {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return jsonArrayToTable(parsed);
    const pruned = JSON.stringify(pruneEmpty(parsed));
    return result(text, pruned, "prune-empty");
  } catch {
    return result(text, text, "noop");
  }
}

const FAIL_MARKERS = [
  /FAIL\b/,
  /Error:/,
  /AssertionError/,
  /✖/,
  /FAILED/,
  /Traceback/,
  /npm ERR!/,
];

/** Keep failures + summary lines; drop repetitive pass noise. */
export function compressTestOutput(text: string): CompressResult {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  let passes = 0;
  for (const line of lines) {
    if (/^\s*(✓|√|PASS|ok |PASSED)/i.test(line) || /\bpassed\b/i.test(line) && !FAIL_MARKERS.some((r) => r.test(line))) {
      if (/^\s*(✓|√)/.test(line)) {
        passes += 1;
        continue;
      }
    }
    if (FAIL_MARKERS.some((r) => r.test(line))) {
      kept.push(line);
      continue;
    }
    if (/^\s*(=======|-------|Test Suites|Tests:|Time:|Ran \d+)/i.test(line)) {
      kept.push(line);
      continue;
    }
    if (/error|fail|warn/i.test(line)) kept.push(line);
  }
  if (passes > 0) kept.unshift(`[optima] suppressed ${passes} passing assertion lines`);
  const compressed = kept.join("\n").trim() || text.slice(0, 2000);
  return result(text, compressed, "test-filter");
}

export function compressGitStatus(text: string): CompressResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const short = lines.slice(0, 80).join("\n");
  const note =
    lines.length > 80 ? `\n… +${lines.length - 80} lines truncated` : "";
  return result(text, short + note, "git-trim");
}

export function compressAuto(text: string, hint?: string): CompressResult {
  if (hint === "json" || /^\s*[\[{]/.test(text)) {
    const j = compressJson(text);
    if (j.method !== "noop") return j;
  }
  if (hint === "test" || /Test Suites|pytest|FAIL|AssertionError/.test(text)) {
    return compressTestOutput(text);
  }
  if (
    hint === "git" ||
    /^##\s/m.test(text) ||
    /^(?:M|A|D|R|C|\?\?)\s+\S+/m.test(text) ||
    /\bgit status\b/i.test(text)
  ) {
    return compressGitStatus(text);
  }
  // Generic: collapse 3+ consecutive newlines to a single blank line
  const collapsed = text
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  return result(text, collapsed, "whitespace");
}

/** Paths that must never be telegraphed/compressed as source. */
export function isSacredPath(path: string): boolean {
  return /\.(ts|tsx|js|jsx|py|go|rs|java|kt|cs|rb|php|md|mdx|rst)$/i.test(path);
}
