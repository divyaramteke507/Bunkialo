# Contributing to Bunkialo

## Workflow

1. Fork the repo.
2. Create a branch from `master`.
3. Make focused changes.
4. Run checks locally.
5. Open a pull request.

## Development Setup

```bash
bun install
bunx expo start
```

## Quality Checks

```bash
bunx tsc --noEmit
bun run src/scripts/test-assignment-scraper.mjs
bun run src/scripts/test-assignment-submit.mjs
bun run src/scripts/test-dashboard.mjs
bun run src/scripts/test-lms-download.mjs
bun run src/scripts/test-resources-scraper.mjs
bun run src/scripts/test-scraper.mjs
bun run src/scripts/test-timetable-logic.mjs
```

## Pull Request Rules

- Keep PRs small and focused.
- Include why the change is needed.
- Include test evidence in PR description.
- Do not commit credentials, tokens, or personal data.

## Coding Rules

- TypeScript strict mode.
- No `any`.
- Prefer NativeWind for styling.
- Keep services React-free.
