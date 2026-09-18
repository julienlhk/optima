# Security & privacy

## Short answer

**Optima does not phone home.** No Optima accounts, no Optima API keys, no Optima cloud backend, no telemetry.

| Question | Answer |
|----------|--------|
| Stores your code on Optima servers? | **No** — there are no Optima servers |
| Network calls from the package after install? | **No** — CLI/libraries do not fetch or upload |
| Requires Optima login / API key? | **No** for install, skills, doctor, debug, bench, estimate, classify |
| Reads your npm auth / `.npmrc` / publish tokens? | **No** — never |
| Reads OpenAI / Anthropic / xAI / other provider keys? | **No** — Optima never proxies model calls |
| What does install write? | Only **your project files** (rules, skills, ignores, `OPTIMA_RUNTIME.md`) |
| What does `analyze` read? | Optional: local Cursor transcripts under `~/.cursor/projects/` on **your machine** — never uploaded |
| Can it “steal” secrets? | It does not transmit data. Still: don’t paste secrets into prompts you send to **model providers** (Cursor/Claude/Grok/etc.) — that path is outside Optima |

## Credentials & auth (what we never touch)

| Credential | Optima behavior |
|------------|-----------------|
| npm login / publish token / `.npmrc` | Not read, not bundled, not sent. Only *you* use these when *you* publish |
| IDE / provider API keys (OpenAI, Anthropic, xAI/Grok, …) | Stay with the IDE or **your** app. Optima does not intercept or forward them |
| Optima product auth | Does not exist — nothing to configure |

When someone runs `npm i -D optima-ai`, the only network step is downloading the package from the **npm registry** (normal package install). That uses npm’s normal client behavior — Optima’s code does not harvest or exfiltrate auth.

## Models & IDEs

Optima is **model-agnostic**. Skills, rules, and libraries do not select or require a specific model.

| Setup | Still private / local? |
|-------|-------------------------|
| Cursor chat on Sonnet, GPT, Grok, … | Yes — Optima is instructions + local files/CLI; the host talks to the provider |
| Claude Code / Codex / other agents that load project rules | Same |
| Your app importing `@optima/*` | Libraries run in-process; **your** code still holds provider keys if you call an LLM |

Soft policy: agents save tokens when they **follow** Optima rules. Optima does not install a network interceptor or MITM on model traffic.

## What Optima touches

| Action | Reads | Writes | Network |
|--------|-------|--------|---------|
| `npm i -D optima-ai` / `optima init` | Package templates | Project: `.cursor/`, `.claude/`, `AGENTS.md`, ignores, … | Only npm registry (package download) |
| `optima doctor` / `optima debug` | Project files + Optima env flags | Optional `OPTIMA_DEBUG.md` if you pass `--write` | None |
| `optima estimate` / `bench` / `classify` | Local files you pass | None | None |
| `optima analyze` | Local `~/.cursor/projects/*/agent-transcripts` | Optional tailored rules in project | None |
| `@optima/*` libraries in your app | Whatever your app passes in | Whatever your app chooses to log | Only if **your** app calls an LLM API |

`optima debug` may print `OPTIMA_SKIP_POSTINSTALL`, `OPTIMA_HOST`, `OPTIMA_PROJECT_ROOT`, and `NODE_ENV` — never npm tokens or provider keys.

## Threat notes

| Risk | Mitigation |
|------|------------|
| Supply chain | Pin `optima-ai` version; prefer npm over opaque curl\|bash; review PRs before merge; npm only updates after an explicit `npm publish` |
| Secret leakage into meters | Log token counts/costs only — not raw prompts |
| Over-compression | Sacred-path helpers; test filters keep FAIL lines |
| Local transcript access | `analyze` is opt-in; runs offline |
| Confusing Optima with the model provider | Bill/keys/retention for chat are the IDE + provider’s terms — Optima never sits in that path |

## Reporting

See [SECURITY.md](../SECURITY.md).
