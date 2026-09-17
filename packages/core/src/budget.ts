import { computeCost, getModelPricing } from "./pricing.js";
import type {
  BudgetLimits,
  CostBreakdown,
  MeterEvent,
  ModelPricing,
  TokenUsage,
} from "./types.js";

export type MeterListener = (event: MeterEvent) => void;

export class TokenMeter {
  private totalTokens = 0;
  private totalUsd = 0;
  private usage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  private softTokensFired = false;
  private softUsdFired = false;
  private readonly listeners = new Set<MeterListener>();

  constructor(
    private readonly modelId: string,
    private readonly limits: BudgetLimits = {},
    private readonly catalog?: ModelPricing[],
  ) {}

  on(listener: MeterListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: MeterEvent): void {
    for (const l of this.listeners) l(event);
  }

  private pricing(): ModelPricing {
    const p = getModelPricing(this.modelId, this.catalog);
    if (!p) {
      throw new Error(`Unknown model pricing for "${this.modelId}"`);
    }
    return p;
  }

  record(delta: TokenUsage): CostBreakdown {
    this.usage.inputTokens += delta.inputTokens;
    this.usage.outputTokens += delta.outputTokens;
    this.usage.cacheReadTokens =
      (this.usage.cacheReadTokens ?? 0) + (delta.cacheReadTokens ?? 0);
    this.usage.cacheWriteTokens =
      (this.usage.cacheWriteTokens ?? 0) + (delta.cacheWriteTokens ?? 0);

    const cost = computeCost(delta, this.pricing());
    const tokens =
      delta.inputTokens +
      delta.outputTokens +
      (delta.cacheReadTokens ?? 0) +
      (delta.cacheWriteTokens ?? 0);
    this.totalTokens += tokens;
    this.totalUsd += cost.totalUsd;

    this.emit({
      type: "usage",
      usage: { ...delta },
      cost,
      totalTokens: this.totalTokens,
      totalUsd: this.totalUsd,
    });

    this.checkLimits();
    return cost;
  }

  private checkLimits(): void {
    const { softTokens, hardTokens, softUsd, hardUsd } = this.limits;
    if (softTokens && !this.softTokensFired && this.totalTokens >= softTokens) {
      this.softTokensFired = true;
      this.emit({
        type: "soft_limit",
        kind: "tokens",
        value: this.totalTokens,
        limit: softTokens,
      });
    }
    if (hardTokens && this.totalTokens >= hardTokens) {
      this.emit({
        type: "hard_limit",
        kind: "tokens",
        value: this.totalTokens,
        limit: hardTokens,
      });
    }
    if (softUsd && !this.softUsdFired && this.totalUsd >= softUsd) {
      this.softUsdFired = true;
      this.emit({
        type: "soft_limit",
        kind: "usd",
        value: this.totalUsd,
        limit: softUsd,
      });
    }
    if (hardUsd && this.totalUsd >= hardUsd) {
      this.emit({
        type: "hard_limit",
        kind: "usd",
        value: this.totalUsd,
        limit: hardUsd,
      });
    }
  }

  snapshot(): {
    usage: TokenUsage;
    totalTokens: number;
    totalUsd: number;
    withinHardLimit: boolean;
  } {
    const withinHardLimit =
      (this.limits.hardTokens === undefined ||
        this.totalTokens < this.limits.hardTokens) &&
      (this.limits.hardUsd === undefined || this.totalUsd < this.limits.hardUsd);
    return {
      usage: { ...this.usage },
      totalTokens: this.totalTokens,
      totalUsd: this.totalUsd,
      withinHardLimit,
    };
  }

  reset(): void {
    this.totalTokens = 0;
    this.totalUsd = 0;
    this.usage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    this.softTokensFired = false;
    this.softUsdFired = false;
  }
}

/** Simple budget helper wrapping TokenMeter soft/hard semantics. */
export class Budget {
  readonly meter: TokenMeter;

  constructor(modelId: string, limits: BudgetLimits, catalog?: ModelPricing[]) {
    this.meter = new TokenMeter(modelId, limits, catalog);
  }

  get exhausted(): boolean {
    return !this.meter.snapshot().withinHardLimit;
  }
}
