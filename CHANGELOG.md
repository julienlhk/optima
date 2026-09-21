# Changelog

## 1.0.3

- `optima compare` — without/with Optima token+$ comparisons (`compress`, `cache`, `context`, `retrieve`, `session`, `demo`)
- `@optima/retrieve` + `optima retrieve` — local search → span reads (index better, keep understanding)
- Prefer retrieve over blind truncation for source; compress stays for tool-log noise

## 1.0.2

- `optima debug` — structured hypothesize → rank → log → fix protocol + local probe
- `optima-debug` skill installed with init
- Clearer privacy/security docs (no telemetry, local-only)

## 1.0.1

- Self-contained CLI (workspace packages bundled)
- Clean install docs: `npm i -D optima-ai` / `npx optima …` only
- Pack smoke test script

## 1.0.0

- Initial npm release of `optima-ai`
- Postinstall wires skills/rules into the consumer project
