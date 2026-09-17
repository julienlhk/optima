# ADR-001: MIT monorepo, skills-first distribution

## Status

Accepted

## Context

Teams need a single install path for agent FinOps that feels like adding a package, plus libraries for app-level metering.

## Decision

Ship Optima under MIT as:
1. Installable skills/rules via `npx optima init` / `npx skills add julienlhk/optima`
2. Scoped libraries `@optima/*` for runtime optimization

## Consequences

Soft policy depends on agent compliance; hard guarantees use `TokenMeter` and compressors in app code.
