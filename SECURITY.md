# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x | Yes |

## Reporting

Email security issues privately to the maintainers listed in the repository owner profile. Do not file public issues for undisclosed vulnerabilities.

## Scope

**In scope:** CLI file writes, local transcript parsing, dependency supply chain, credential handling in this package.

**Out of scope:** Model provider outages, IDE bugs, and retention/billing policies of Cursor, Anthropic, OpenAI, xAI, etc.

---

## Privacy (short answer)

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
| Can it “steal” secrets? | It does not transmit data. Still: don’t paste secrets into prompts you send to **model providers** — that path is outside Optima |

## Credentials & auth (what we never touch)

| Credential | Optima behavior |
|------------|-----------------|
| npm login / publish token / `.npmrc` | Not read, not bundled, not sent. Only *you* use these when *you* publish |
| IDE / provider API keys (OpenAI, Anthropic, xAI/Grok, …) | Stay with the IDE or **your** app. Optima does not intercept or forward them |
| Optima product auth | Does not exist — nothing to configure |

When someone runs `npm i -D optima-ai`, the only network step is downloading the package from the **npm registry** (normal package install). Optima’s code does not harvest or exfiltrate auth.

## Models & IDEs

Optima is **model-agnostic**. Skills, rules, and libraries do not select or require a specific model (Sonnet, GPT, Grok, …). Soft policy only — no network interceptor or MITM on model traffic.

## What Optima touches

| Action | Reads | Writes | Network |
|--------|-------|--------|---------|
| `npm i -D optima-ai` / `optima init` | Package templates | Project rules, skills, ignores, … | Only npm registry (package download) |
| `optima doctor` / `optima debug` | Project files + Optima env flags | Optional `OPTIMA_DEBUG.md` with `--write` | None |
| `optima estimate` / `bench` / `classify` | Local files you pass | None | None |
| `optima analyze` | Local Cursor transcripts on disk | Optional tailored rules in project | None |
| `@optima/*` libraries | Whatever your app passes in | Whatever your app logs | Only if **your** app calls an LLM API |

`optima debug` may print `OPTIMA_SKIP_POSTINSTALL`, `OPTIMA_HOST`, `OPTIMA_PROJECT_ROOT`, and `NODE_ENV` — never npm tokens or provider keys.

## Threat notes

| Risk | Mitigation |
|------|------------|
| Supply chain | Pin `optima-ai` version; prefer npm over opaque curl\|bash; review PRs before merge; npm only updates after an explicit `npm publish` |
| Secret leakage into meters | Log token counts/costs only — not raw prompts |
| Over-compression | Sacred-path helpers; test filters keep FAIL lines |
| Local transcript access | `analyze` is opt-in; runs offline |
| Confusing Optima with the model provider | Chat keys/billing/retention are the IDE + provider’s terms — Optima never sits in that path |

More narrative docs: [docs/security.md](./docs/security.md).
