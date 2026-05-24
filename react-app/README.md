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

## HTTPS dev server (camera on the LAN)

`pnpm dev` serves over **HTTPS** via `@vitejs/plugin-basic-ssl`, which generates
a self-signed cert on first boot (cached at
`react-app/node_modules/.vite/basic-ssl/_cert.pem`), and binds to `0.0.0.0`
(host `true`) so phones on the same LAN can connect. The browser's
`getUserMedia` API needs a secure context on any origin other than `localhost`,
so HTTP would silently break camera access during phone testing.

Vite prints the LAN URL on start, e.g.:

```
➜  Local:   https://localhost:5173/
➜  Network: https://192.168.1.42:5173/
```

### Trusting the cert

The cert is self-signed, so every device has to accept it once:

- **Desktop browser** — open the LAN URL, click through the warning (Chrome:
  *Advanced → Proceed*; Firefox: *Advanced → Accept the Risk*).
- **Android / Chrome** — same flow; the warning has a *Continue to site* link.
- **iOS / Safari** — tap *Show Details → visit this website → Visit Website*.
  iOS scopes the trust to that hostname and remembers it until the cert
  expires (1 year by default).

The cert is **for local development only** — do not deploy it.

To force a new cert (e.g. after switching networks so the LAN IP changes),
delete `react-app/node_modules/.vite/basic-ssl/` and restart `pnpm dev`.

If a device refuses to trust the self-signed cert (corporate MDM, strict
HSTS), generate a locally-trusted cert with [mkcert](https://github.com/FiloSottile/mkcert)
and point Vite at it via `server.https = { key, cert }` in `vite.config.ts`
instead of `basicSsl()`.

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
