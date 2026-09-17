import type { CostBreakdown, ModelPricing, TokenUsage } from "./types.js";
import { DEFAULT_PRICING } from "./pricing-data.js";

export function listDefaultPricing(): ModelPricing[] {
  return structuredClone(DEFAULT_PRICING);
}

export function getModelPricing(
  modelId: string,
  catalog: ModelPricing[] = DEFAULT_PRICING,
): ModelPricing | undefined {
  const exact = catalog.find((m) => m.id === modelId);
  if (exact) return exact;
  return catalog.find(
    (m) => modelId.startsWith(m.id) || m.id.startsWith(modelId),
  );
}

function perM(tokens: number, rate?: number): number {
  if (!rate || tokens <= 0) return 0;
  return (tokens / 1_000_000) * rate;
}

export function computeCost(
  usage: TokenUsage,
  pricing: ModelPricing,
): CostBreakdown {
  const inputUsd = perM(usage.inputTokens, pricing.inputPerMTok);
  const outputUsd = perM(usage.outputTokens, pricing.outputPerMTok);
  const cacheReadUsd = perM(
    usage.cacheReadTokens ?? 0,
    pricing.cacheReadPerMTok ?? pricing.inputPerMTok * 0.1,
  );
  const cacheWriteUsd = perM(
    usage.cacheWriteTokens ?? 0,
    pricing.cacheWritePerMTok ?? pricing.inputPerMTok * 1.25,
  );
  return {
    inputUsd,
    outputUsd,
    cacheReadUsd,
    cacheWriteUsd,
    totalUsd: inputUsd + outputUsd + cacheReadUsd + cacheWriteUsd,
    currency: "USD",
  };
}

export function formatUsd(value: number, digits = 6): string {
  return `$${value.toFixed(digits)}`;
}
