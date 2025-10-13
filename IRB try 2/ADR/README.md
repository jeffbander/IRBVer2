# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the IRB Management System.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-use-nextjs-app-router.md) | Use Next.js App Router | Accepted | 2025-10-02 |
| [0002](0002-use-prisma-sqlite.md) | Use Prisma with SQLite for Development | Accepted | 2025-10-02 |
| [deps](deps.md) | Dependency Justifications | Living | 2025-10-02 |

## Template

Use this template for new ADRs:

```markdown
# ADR-XXXX: [Short Title]

**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Deciders:** [Names]

## Context
What is the issue we're trying to solve? Include evidence and constraints.

## Decision
What decision did we make? Be specific.

## Consequences
### Positive
- What improves

### Negative
- What trade-offs

### Neutral
- What changes

## Alternatives Considered
1. Option A - why rejected
2. Option B - why rejected

## Test Plan
How will we validate this decision works?
```

## Guidelines

1. **One Decision Per ADR**: Keep focused
2. **Immutable**: Don't edit after acceptance, supersede instead
3. **Evidence-Based**: Include metrics, links, examples
4. **Actionable**: Include migration plan if needed
