# Adopting Optima

## Greenfield

1. `pnpm optima init --host all` in the new repo
2. Commit generated ignores + rules
3. Import `@optima/core` / `@optima/cache` in any API that calls LLMs
4. Add CI: `optima doctor` + taxonomy validate

## Brownfield

1. Start with **ignore boundaries** + Cursor rule only (`--host cursor`)
2. Prefer **search → span read** (`optima retrieve`) over dumping files; use compress for tool logs only
3. Run `optima analyze --apply-rules` on existing Cursor transcripts
4. Introduce diet `on` before `ultra`
5. Wire `TokenMeter` around production LLM calls last

## Host matrix

| Host | Artifact |
|------|----------|
| Cursor | `.cursor/rules/optima.mdc`, `.cursorignore` |
| Claude Code | `.claude/skills/optima`, `CLAUDE.md`, `.claudeignore` |
| Codex | `AGENTS.md`, `.codexignore` |
| Windsurf | `.windsurf/rules/optima.md` |

## Rollout risks

- Soft policy can be ignored by non-compliant models — pair with meters in apps.
- Aggressive ignores may hide needed assets — maintain allowlists.
- Ultra diet is chat-only; never apply to sacred artifacts.
