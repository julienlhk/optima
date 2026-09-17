export type DietLevel = "off" | "lite" | "on" | "ultra";

export type Zone = 0 | 1 | 2 | 3;

export type ZoneName = "sacred" | "premium" | "hybrid" | "ops";

export const ZONE_NAMES: Record<Zone, ZoneName> = {
  0: "sacred",
  1: "premium",
  2: "hybrid",
  3: "ops",
};

export type OptimizationLayer =
  | "input_context"
  | "output"
  | "cache"
  | "model_routing"
  | "session_agent"
  | "metering_finops"
  | "quality_floors";

export type Effort = "low" | "medium" | "high";
export type Risk = "low" | "medium" | "high";
export type EvidenceKind = "measured" | "behavioral" | "estimated";

export interface OptimizationTechnique {
  id: string;
  name: string;
  layer: OptimizationLayer;
  effort: Effort;
  risk: Risk;
  evidence: EvidenceKind;
  summary: string;
  whenToUse: string[];
  antiPatterns: string[];
  relatedIds?: string[];
}

export interface WasteFinding {
  code: string;
  severity: "info" | "warn" | "error";
  title: string;
  detail: string;
  techniqueIds: string[];
  score: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface CostBreakdown {
  inputUsd: number;
  outputUsd: number;
  cacheReadUsd: number;
  cacheWriteUsd: number;
  totalUsd: number;
  currency: "USD";
}

export interface ModelPricing {
  id: string;
  provider: "anthropic" | "openai" | "google" | "other";
  /** USD per 1M tokens */
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok?: number;
  cacheWritePerMTok?: number;
}

export type TokenizerAdapter = {
  name: string;
  count(text: string): number | Promise<number>;
};

export interface BudgetLimits {
  softTokens?: number;
  hardTokens?: number;
  softUsd?: number;
  hardUsd?: number;
}

export type MeterEvent =
  | { type: "usage"; usage: TokenUsage; cost: CostBreakdown; totalTokens: number; totalUsd: number }
  | { type: "soft_limit"; kind: "tokens" | "usd"; value: number; limit: number }
  | { type: "hard_limit"; kind: "tokens" | "usd"; value: number; limit: number };
