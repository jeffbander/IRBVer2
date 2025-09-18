# Repository Guidelines

## Project Structure & Module Organization
Work primarily in `healthcare-voice-app/src`, which contains the app router entry (`app`), shared UI primitives (`components/ui`), feature dashboards (`components/dashboard`), utilities (`lib`), and domain contracts (`types`). The nested `healthcare-voice-app/healthcare-voice-app` directory hosts the runnable Next.js workspace and build artifacts (`.next/`, `node_modules/`); keep generated folders untouched and commit only sources. Update the root reference docs (`system-architecture.md`, `deployment-configuration.md`, `integration-map.md`) and prompt specs in `prompts/` whenever call flows, APIs, or agent behavior change.

## Build, Test, and Development Commands
From `healthcare-voice-app/healthcare-voice-app` run:
- `npm install` – install/update workspace dependencies.
- `npm run dev` – start the Turbopack dev server at `http://localhost:3000`.
- `npm run build` – create an optimized production bundle.
- `npm start` – serve the last production build locally.
Document any manual setup (e.g., required environment variables in `.env.local`) in PRs until automation is added.

## Coding Style & Naming Conventions
Use TypeScript throughout; prefer named exports and PascalCase component names in `src/components`. Keep files scoped by feature, colocating `types` and utilities when they are reused. Stick to 2-space indentation, single quotes for strings, and Tailwind classes for styling; compose class lists with `cn` from `@/lib/utils`. Client components must be marked with `'use client'`, and route handlers belong under `src/app/api/*`.

## Testing Guidelines
Automated tests are not yet configured. When adding behavior, include lightweight React Testing Library or Playwright coverage under `src/__tests__` (name files `*.test.tsx`) and wire the command into `package.json`. Until then, record manual verification steps in the PR checklist, especially around urgent-call flows and webhook handling.

## Commit & Pull Request Guidelines
Write imperative commits (~50 chars) and, when possible, adopt Conventional Commit prefixes (`feat:`, `fix:`) to match the existing history. Open PRs with a concise summary, linked issues, screenshots of UI changes, and a list of commands/tests executed. Flag any schema or configuration updates so reviewers can mirror them, and never include secrets or patient-identifiable data in diffs or comments.

## Security & Configuration Tips
All patient data is regulated; store credentials in local `.env` files and follow the safeguards documented in `deployment-configuration.md`. Review API changes against `api-specification.md` before shipping, and propagate HIPAA-impacting updates to the compliance owner.
