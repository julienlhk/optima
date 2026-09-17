import type { TokenizerAdapter } from "./types.js";

/** Fast heuristic: ~4 characters per token for English/code mix. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function countTokens(
  text: string,
  adapter?: TokenizerAdapter,
): Promise<number> {
  if (!adapter) return estimateTokens(text);
  return adapter.count(text);
}

export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.role) + estimateTokens(m.content) + 4;
  }
  return total;
}

export const charsPerTokenHeuristic = 4;
