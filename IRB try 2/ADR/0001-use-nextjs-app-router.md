# ADR-0001: Use Next.js 14 App Router

**Status:** Accepted
**Date:** 2025-10-02
**Deciders:** Development Team

## Context

The IRB Management System requires a modern web framework with:
- Server-side rendering for better performance
- Built-in API routes
- Strong TypeScript support
- React-based UI components
- File-based routing

## Decision

Use **Next.js 14 with App Router** as the primary web framework.

### Specific Choices:
- **Version:** Next.js 14.2.5 (will be pinned in deps)
- **Router:** App Router (`app/` directory) for layouts and streaming
- **Rendering:** Server Components by default, Client Components where needed
- **API:** Route Handlers in `app/api/`
- **Styling:** Tailwind CSS

## Consequences

### Positive
- Fast development with file-based routing
- Excellent developer experience with hot reload
- Built-in optimizations (image, font, script)
- Strong TypeScript integration
- Large community and ecosystem
- Server Components reduce client bundle size

### Negative
- Learning curve for App Router paradigms
- Some third-party libraries not compatible with Server Components
- Framework lock-in
- Must follow Next.js conventions

### Neutral
- Requires Node.js runtime (already in our stack)
- Opinionated structure (good for consistency)

## Alternatives Considered

1. **Remix** - Rejected: Smaller ecosystem, less mature
2. **Vite + React Router** - Rejected: More manual configuration needed
3. **Next.js Pages Router** - Rejected: App Router is the future direction

## Test Plan

- Playwright E2E tests cover all routes
- Performance budgets for page load times
- TypeScript compilation with strict mode
- Build succeeds for production deployment

## Migration Notes

N/A - Already implemented in codebase.

## Related

- See ADR-0002 for database choice
- See `docs/ARCH/` for architecture diagrams
