# API surface

Typed entry points (after `pnpm build`):

| Package | Import |
|---------|--------|
| core | `import { TokenMeter, estimateTokens, computeCost, resolveZone } from "@ai-opt/core"` |
| classify | `import { classify, TAXONOMY, exportTaxonomyDocument } from "@ai-opt/classify"` |
| compress | `import { compressAuto, isSacredPath } from "@ai-opt/compress"` |
| cache | `import { buildCacheableMessages, lintCachePrefix } from "@ai-opt/cache"` |
| analyze | `import { discoverSessions, analyzeSessions } from "@ai-opt/analyze"` |
| cli | `import { run, initProject } from "@ai-opt/cli"` |

Generate richer docs with your preferred TSDoc tool against `packages/*/dist/*.d.ts`.
