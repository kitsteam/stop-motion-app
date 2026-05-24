# StopClip — React port (Milestone 0)

Parallel React + Vite + TypeScript app built alongside the Angular root during the
[migration](../docs/migration-react.md). Lives under `react-app/` from M0 through M4
and moves to the repo root at M5.

## Stack

| Layer            | Tool                                      |
|------------------|-------------------------------------------|
| Build / dev      | Vite 8 + `@vitejs/plugin-react`           |
| UI               | React 19 + TypeScript 6                   |
| Tests            | Vitest 4 + React Testing Library + jsdom  |
| Package manager  | **pnpm 11** (Corepack)                    |

The Angular tree at the repo root keeps its own Yarn 4 setup. The two package
managers coexist because the package roots are independent.

## First-time setup

Node 22+ required.

```bash
corepack enable          # one-time per machine; activates the pnpm shim
cd react-app
pnpm install             # resolves from pnpm-lock.yaml
```

> If `corepack enable` fails with EACCES, run it as root once
> (`sudo corepack enable`) or install pnpm globally with your package manager —
> the `packageManager` field in `package.json` still pins the version.

## Daily commands

All commands run from `react-app/`.

```bash
pnpm dev          # Vite dev server (default http://localhost:5173)
pnpm build        # tsc -b && vite build → dist/
pnpm test         # vitest run (CI mode)
pnpm test:watch   # vitest watch
pnpm lint         # eslint .
pnpm preview      # serve the built dist/
```

## Path aliases

Mirrors `../tsconfig.json` so framework-agnostic enums, interfaces, and models
can be imported from the Angular tree during the M0–M4 coexistence window:

| Alias            | Target                          |
|------------------|---------------------------------|
| `@components/*`  | `../src/app/components/*`       |
| `@environment/*` | `../src/environments/*`         |
| `@enums/*`       | `../src/app/enums/*`            |
| `@interfaces/*`  | `../src/app/interfaces/*`       |
| `@models/*`      | `../src/app/models/*`           |
| `@pages/*`       | `../src/app/pages/*`            |
| `@pipes/*`       | `../src/app/pipes/*`            |
| `@services/*`    | `../src/app/services/*`         |

Defined in `tsconfig.app.json` (typecheck) and `vite.config.ts` (bundler).
Keep the two in sync.

Only **framework-agnostic** files (plain enums, interfaces, value classes) are
safe to import this way. Anything decorated with `@Injectable` or relying on
Angular DI must wait for its dedicated migration milestone — see
[`../docs/migration-react.md`](../docs/migration-react.md).
