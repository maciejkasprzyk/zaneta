<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- Package manager: **pnpm** (never npm/yarn). Add deps with `pnpm add`.
- Lint + format: **Biome** (no ESLint/Prettier). Run `pnpm format` before committing; `pnpm lint` must pass.
- UI: Tailwind CSS v4 + **shadcn/ui** (Base UI primitives). Add components with `pnpm dlx shadcn@latest add <name>`; they land in `src/components/ui/` and may be edited. Use `cn()` from `@/lib/utils` to merge classes.
- Tests: **Vitest** + Testing Library for unit tests (`*.test.tsx` next to the code, `pnpm test`); **Playwright** for end-to-end tests in `e2e/` (`pnpm test:e2e`).
- Before finishing a change run: `pnpm lint && pnpm typecheck && pnpm test`.

## Todo data layer

- Domain code lives in `src/lib/todo/` (types, pure `todoReducer`, sorting, dates, effort helpers).
- Every change is a `TodoAction`; the same reducer updates the UI state (`TodoProvider` / `useTodos` in `store.tsx`) and is persisted through the `TodoRepository` interface (`repository.ts`).
- The only implementation today is `LocalStorageTodoRepository` (key `zaneta:todo:v1`). To move to a database, add another `TodoRepository` and pass it to `<TodoProvider repository={…}>`; components don't need to change.
