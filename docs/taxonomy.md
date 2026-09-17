# Taxonomy

Seven layers of AI/token optimization. Machine-readable export:

```bash
pnpm ai-opt taxonomy
```

JSON Schema: `packages/classify/src/taxonomy.schema.json`

## Layers

| Layer | Focus |
|-------|-------|
| `input_context` | Ignores, surgical retrieval, progressive disclosure, compaction |
| `output` | Zone routing, diet levels, tool-output filters |
| `cache` | Stable prefixes, breakpoints, TTL economics |
| `model_routing` | Cheap explore / strong verify, task-class routing |
| `session_agent` | Turn minimization, tool batching, sub-agent bounds |
| `metering_finops` | Budgets, cost models, waste heuristics |
| `quality_floors` | Sacred zone, critical tests |

## Technique card shape

Each technique includes: `id`, `name`, `layer`, `effort`, `risk`, `evidence`, `summary`, `whenToUse`, `antiPatterns`, optional `relatedIds`.

## Classifier

```ts
import { classify } from "@ai-opt/classify";

const result = classify({
  text: "enable cache_control and reduce git verbosity",
  signals: { usesCaching: true, verboseTools: true },
});
// result.playbook — ordered coaching lines
```

See full catalog in `@ai-opt/classify` source (`TAXONOMY`).
