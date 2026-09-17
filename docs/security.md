# Security

## Defaults

- **No network telemetry** from libraries or CLI.
- Transcript analysis reads local Cursor files under `~/.cursor/projects/` only.
- Installers write only into the target project (and optional `.claude/skills` copy).

## Threat notes

| Risk | Mitigation |
|------|------------|
| Supply chain | Prefer `pnpm optima` from this repo / pinned npm publish; avoid opaque curl\|bash as sole path |
| Secret leakage into meters | Do not log raw prompts in production meters; log token counts/costs only |
| Over-compression | Sacred-path helpers; test filters keep FAIL/trace lines |

## Reporting

See [SECURITY.md](../SECURITY.md).
