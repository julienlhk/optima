---
trigger: always_on
---

# AI Opt

Token & agent FinOps policy for this project.

- Quality floor: code/docs/tests stay precise; never skip critical safety tests.
- Diet `on`: answer-first, grep-before-read, batch tools, minimize turns.
- Zones: 0 sacred (code/docs), 1 premium (plan/arch), 2 hybrid (default), 3 ops (git/cmd terse).
- Skip lockfiles/node_modules/build noise unless required.
- Compact or restart near 60–75% context use.
