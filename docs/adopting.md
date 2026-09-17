# Adopting AI Opt

## Greenfield

1. `pnpm ai-opt init --host all` in the new repo
2. Commit generated ignores + rules
3. Import `@ai-opt/core` / `@ai-opt/cache` in any API that calls LLMs
4. Add CI: `ai-opt doctor` + taxonomy validate

## Brownfield

1. Start with **ignore boundaries** + Cursor rule only (`--host cursor`)
2. Run `ai-opt analyze --apply-rules` on existing Cursor transcripts
3. Introduce diet `on` before `ultra`
4. Wire `TokenMeter` around production LLM calls last

## Host matrix

| Host | Artifact |
|------|----------|
| Cursor | `.cursor/rules/ai-opt.mdc`, `.cursorignore` |
| Claude Code | `.claude/skills/ai-opt`, `CLAUDE.md`, `.claudeignore` |
| Codex | `AGENTS.md`, `.codexignore` |
| Windsurf | `.windsurf/rules/ai-opt.md` |

## Rollout risks

- Soft policy can be ignored by non-compliant models — pair with meters in apps.
- Aggressive ignores may hide needed assets — maintain allowlists.
- Ultra diet is chat-only; never apply to sacred artifacts.
