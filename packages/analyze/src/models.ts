export interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
}

export interface Turn {
  role: "user" | "assistant" | "tool" | "system" | "unknown";
  text: string;
  tools: ToolCall[];
  estimatedTokens: number;
}

export interface Session {
  id: string;
  path: string;
  mtimeMs: number;
  turns: Turn[];
}

export interface AnalysisReport {
  sessionsAnalyzed: number;
  totalEstimatedTokens: number;
  wasteScore: number;
  findings: import("@ai-opt/core").WasteFinding[];
  tailoredRules: string[];
  aggregateByCode: Record<string, number>;
}
