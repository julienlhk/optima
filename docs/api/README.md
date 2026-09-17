# API surface

Typed entry points (after `pnpm build`):

| Package | Import |
|---------|--------|
| core | `import { TokenMeter, estimateTokens, computeCost, resolveZone } from "@optima/core"` |
| classify | `import { classify, TAXONOMY, exportTaxonomyDocument } from "@optima/classify"` |
| compress | `import { compressAuto, isSacredPath } from "@optima/compress"` |
| cache | `import { buildCacheableMessages, lintCachePrefix } from "@optima/cache"` |
| analyze | `import { discoverSessions, analyzeSessions } from "@optima/analyze"` |
| cli | `import { run, initProject } from "@optima/cli"` |

Generate richer docs with your preferred TSDoc tool against `packages/*/dist/*.d.ts`.
