# AI Opt — Implementation Checklist

## Scaffold
- [x] Root monorepo (pnpm, TS, Vitest, MIT)
- [x] Package stubs for core, classify, compress, cache, analyze, cli

## Core + Classify
- [x] `@ai-opt/core` — tokens, budgets, cost tables, types
- [x] `@ai-opt/classify` — taxonomy + classifier + JSON Schema

## Compress + Cache
- [x] `@ai-opt/compress` — deterministic compressors
- [x] `@ai-opt/cache` — cache-aware prompt builders + lint

## Analyze + CLI
- [x] `@ai-opt/analyze` — Cursor transcript waste scoring
- [x] `@ai-opt/cli` — init / install / doctor / analyze / classify / bench / estimate

## Skills + Templates
- [x] Skills (context, finops-zones, diet levels)
- [x] Ignore templates + host adapters

## Docs + Examples + CI
- [x] Enterprise docs, Mermaid, ADRs
- [x] Examples + benchmarks + GitHub Actions

## Verify
- [x] lint / typecheck / tests / e2e CLI

## Review

Delivered an MIT TypeScript monorepo with six packages, multi-host skills/templates, taxonomy (20 techniques / 7 layers), enterprise docs, and CI. Verified: `pnpm build`, `pnpm test` (24/24), `pnpm typecheck`, `ai-opt init/doctor/bench/estimate/classify/parse-fixture`.
