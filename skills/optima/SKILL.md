---
name: optima
description: Token and agent FinOps for this repo — diet levels, zone routing, context hygiene, cache-aware API guidance. Use when optimizing tokens, costs, agent verbosity, or context packing. Install via npx optima init or npx skills add julienlhk/optima.
---

# Optima

## Overview

Optima is the optimization layer for AI coding agents in this repository. Cut avoidable tokens without sacrificing correctness.

## When to use

- User asks to save tokens, reduce cost, or stop verbose agent output
- Long sessions approaching context limits
- Setting up Cursor / Claude / Codex FinOps rules
- Designing API prompts for prompt caching

## Install (for humans)

```bash
npm i -D optima-ai
# or one-shot:
npx optima-ai init --host all
npx skills add julienlhk/optima
```

## Levels

`/optima off|lite|on|ultra` (or ask to set diet level)

- **off** — no diet
- **lite** — compress chat only
- **on** — default (answer-first + surgical context)
- **ultra** — telegraphic chat; never telegraph code/docs/tests/IDs

## Process

1. Confirm diet level and zone (sacred wins for code/docs).
2. Prefer grep → targeted read → batch tools.
3. Respect ignore boundaries (`.cursorignore`, `.optimaignore`, …).
4. For API work: stable prefix, cache breakpoints, no timestamps in cached prefixes.
5. At ~60–75% context, compact or hand off to a fresh session.

## Buckets

| Bucket | Rule |
|--------|------|
| A Replies | Answer-first |
| B Docs/plans | Dense |
| C Tests | Key + edge; never skip money/auth/data-loss |
| D Code | YAGNI, idiomatic — not cryptic |
| E Context | Grep-before-read, line ranges, min turns |
| F Tools | Batch, stop early |
| G Sub-agents | Cheap bounded search; strong model verifies |

## Zones

0 Sacred · 1 Premium · 2 Hybrid · 3 Ops — see `OPTIMA_RUNTIME.md`.

## Rationalizations to reject

| Excuse | Response |
|--------|----------|
| "I'll dump the whole repo to be safe" | Surgical retrieval is safer and cheaper |
| "Ultra mode on the PRD" | Premium/sacred content stays precise |
| "Skip auth tests to save tokens" | Forbidden — quality floor |

## Verification

- [ ] Code/docs remain precise
- [ ] No critical tests skipped
- [ ] Context from ignores avoided unless required
- [ ] Zone 3 did not pollute Zone 0
