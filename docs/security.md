# Security & privacy

## Short answer

**Optima does not phone home.** No accounts, no API keys, no cloud backend, no telemetry.

| Question | Answer |
|----------|--------|
| Stores your code on our servers? | **No** — there are no Optima servers |
| Network calls from the package? | **No** — install/CLI/libraries do not fetch or upload |
| Requires login / API key? | **No** for install, skills, doctor, debug, bench, estimate, classify |
| What does install write? | Only **your project files** (rules, skills, ignores, `OPTIMA_RUNTIME.md`) |
| What does `analyze` read? | Optional: local Cursor transcripts under `~/.cursor/projects/` on **your machine** — never uploaded |
| Can it “steal” secrets? | It does not transmit data. Still: don’t paste secrets into prompts you send to **model providers** (Cursor/Claude/etc.) — that is outside Optima |

## What Optima touches

| Action | Reads | Writes | Network |
|--------|-------|--------|---------|
| `npm i -D optima-ai` / `optima init` | Package templates | Project: `.cursor/`, `.claude/`, `AGENTS.md`, ignores, … | Only npm registry (package download) |
| `optima doctor` / `optima debug` | Project files | Optional `OPTIMA_DEBUG.md` if you pass `--write` | None |
| `optima estimate` / `bench` / `classify` | Local files you pass | None | None |
| `optima analyze` | Local `~/.cursor/projects/*/agent-transcripts` | Optional tailored rules in project | None |
| `@optima/*` libraries in your app | Whatever your app passes in | Whatever your app chooses to log | Only if **your** app calls an LLM API |

## Threat notes

| Risk | Mitigation |
|------|------------|
| Supply chain | Pin `optima-ai` version; prefer npm over opaque curl\|bash |
| Secret leakage into meters | Log token counts/costs only — not raw prompts |
| Over-compression | Sacred-path helpers; test filters keep FAIL lines |
| Local transcript access | `analyze` is opt-in; runs offline |

## Reporting

See [SECURITY.md](../SECURITY.md).
