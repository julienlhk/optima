# Benchmarks

Honest micro-benches — **not** marketing savings claims.

## Compress fixture

```bash
pnpm ai-opt bench
```

Expect `compressRatio < 1` for homogeneous JSON arrays and suppressed passing test lines.

## Transcript waste fixture

```bash
pnpm ai-opt parse-fixture benchmarks/fixtures/wasteful-session.jsonl
```

Expect codes: `broad_glob`, `noisy_reads`, `vague_prompt`, `retry_loop`.

## Ranges (illustrative)

| Scenario | What we measure | Expected |
|----------|-----------------|----------|
| JSON table compress | char ratio | often 0.3–0.8 |
| Test output filter | pass lines removed | >0 suppressed |
| Cache lint | timestamp in prefix | ≥1 issue |

Production agent bill reductions depend on model, workload, and compliance with soft policy — measure in your environment.
