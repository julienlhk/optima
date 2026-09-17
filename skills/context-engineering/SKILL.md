---
name: context-engineering
description: Pack agent context efficiently — progressive disclosure, trim thresholds, lost-in-the-middle ordering, session handoffs. Use when managing long contexts or designing skills/rules.
---

# Context Engineering

## Overview

Context is a scarce, ordered resource. Pack only what the current step needs.

## Process

1. **Hierarchy:** always-on (tiny) → on-demand skill → retrieved files → tool outputs.
2. **Ordering:** stable instructions first; volatile user/task last (cache-friendly).
3. **Trim at ~75%:** summarize or restart with a handoff checklist.
4. **Protect:** decisions, IDs, error text, security findings — do not drop.
5. **Cut first:** narration, duplicate file bodies, lockfiles, build noise.

## Lost-in-the-middle

Place critical constraints at the start and end of the packed context; avoid burying them mid-dump.

## Handoff template

```
Goal:
Done:
Open:
Files:
Commands to re-run:
Risks:
```

## Verification

- [ ] Always-on rules remain short
- [ ] No full-repo dump
- [ ] Handoff is restartable
