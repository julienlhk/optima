# AI Opt

**Production AI agent & token optimization** — metering, taxonomy, compression, prompt-cache builders, Cursor transcript analysis, and multi-host agent skills.

MIT · TypeScript · Node ≥ 20 · Importable packages + one-command project init.

## 60-second start

```bash
# From this monorepo
pnpm install
pnpm build
pnpm test

# Scaffold FinOps rules into any project
pnpm ai-opt init --host all
pnpm ai-opt doctor
pnpm ai-opt estimate --file README.md --model claude-sonnet-4
pnpm ai-opt classify README.md
pnpm ai-opt bench
```

### Use as libraries

```ts
import { TokenMeter, estimateTokens } from "@ai-opt/core";
import { classify } from "@ai-opt/classify";
import { buildCacheableMessages } from "@ai-opt/cache";
import { compressAuto } from "@ai-opt/compress";
import { analyzeSessions, discoverSessions } from "@ai-opt/analyze";
```

## Packages

| Package | Role |
|---------|------|
| `@ai-opt/core` | Token estimate, budgets, cost tables, zones/diet types |
| `@ai-opt/classify` | Optimization taxonomy + playbook classifier |
| `@ai-opt/compress` | Deterministic JSON/test/git compressors |
| `@ai-opt/cache` | Cache-aware message builders + prefix lint |
| `@ai-opt/analyze` | Cursor transcript waste scoring → tailored rules |
| `@ai-opt/cli` | `ai-opt` CLI |

## What this is

A **canonical optimization mind** for agents and LLM apps: classified techniques, enforceable library APIs, installable host policies, and honest benches.

## What this is not

- Not a fork of upstream repos (see [ATTRIBUTION.md](./ATTRIBUTION.md))
- Not a PolyForm-licensed hook interceptor (v1 is libraries + soft policy + analyzers)

## Docs

- [Architecture](./docs/architecture.md)
- [Taxonomy](./docs/taxonomy.md)
- [Adopting](./docs/adopting.md)
- [Security](./docs/security.md)
- [Compliance](./docs/compliance.md)
- [ADRs](./docs/adr/)

## License

MIT — see [LICENSE](./LICENSE).
