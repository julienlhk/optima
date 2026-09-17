import type { DietLevel, Zone, ZoneName } from "./types.js";
import { ZONE_NAMES } from "./types.js";

const ZONE_TAGS: Record<string, Zone> = {
  PLAN: 1,
  ARCH: 1,
  PRD: 1,
  DESIGN: 1,
  CMD: 3,
  GIT: 3,
  PKG: 3,
  QUICK: 3,
};

export function zoneName(zone: Zone): ZoneName {
  return ZONE_NAMES[zone];
}

export function resolveZone(input: {
  writesCodeOrDocs?: boolean;
  text?: string;
  override?: Zone;
}): Zone {
  if (input.override !== undefined) return input.override;
  if (input.writesCodeOrDocs) return 0;
  const text = input.text ?? "";
  const tag = text.match(/\[(PLAN|ARCH|PRD|DESIGN|CMD|GIT|PKG|QUICK)\]/i);
  if (tag) {
    const key = tag[1]!.toUpperCase();
    return ZONE_TAGS[key] ?? 2;
  }
  if (/!\s*fast\b/i.test(text) || /\$\s*$/m.test(text)) return 3;
  if (/\b(architecture|design|prd|roadmap)\b/i.test(text)) return 1;
  if (/\b(git|npm|pnpm|yarn|docker|kubectl)\b/i.test(text)) return 3;
  return 2;
}

export function dietGuidance(level: DietLevel): string {
  switch (level) {
    case "off":
      return "No diet constraints. Prefer clarity over brevity.";
    case "lite":
      return "Compress chat and progress only. Keep docs, tests, and code fully precise.";
    case "on":
      return "Answer-first. Dense docs. Grep before read. Batch tools. Minimize turns. Keep correctness.";
    case "ultra":
      return "Telegraphic chat/progress only. Never telegraph code, paths, tests, docs, or IDs.";
  }
}
