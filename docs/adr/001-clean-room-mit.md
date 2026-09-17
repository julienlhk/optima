# ADR-001: Clean-room MIT monorepo (no upstream vendoring)

## Status

Accepted

## Context

Source inspiration repos include PolyForm Noncommercial and unlicensed material. Enterprise adopters need clear redistribution rights.

## Decision

Implement original TypeScript packages under MIT. Credit inspirations in ATTRIBUTION.md. Do not vendor restricted code.

## Consequences

Hook-interceptor depth of Noncommercial tools is out of v1 scope; soft policy + libraries ship first.
