# StopClip - Stop Motion App

[StopClip](https://kits.blog/) is a client-side PWA for creating stop-motion animations. Capture, encoding, and export all happen in the browser; there is no backend.

Inspired by Stop Motion Animator by [szager](https://github.com/szager/stop-motion) (BSD-0). This is a fork of the [kits GitLab repository](https://gitlab.com/kits-apps/stop-motion-app).

## Stack

- React 19 + TypeScript, built with Vite
- pnpm (via Corepack) on Node 22
- Vitest for unit tests; Playwright (planned) for E2E
- Web app shipped as a PWA (Workbox via `vite-plugin-pwa`)
- Production image: nginx (unprivileged) serving the Vite build

The React source lives in [`react-app/`](./react-app). A repo-root move is planned in a follow-up.

## Local development

```
corepack enable
pnpm --dir react-app install --frozen-lockfile
pnpm --dir react-app dev        # http://localhost:5173
pnpm --dir react-app test       # vitest
pnpm --dir react-app lint
pnpm --dir react-app build      # outputs to react-app/dist
```

## Docker

```
# Dev — Vite dev server on host port 5173
docker compose up -d
docker compose exec app bash

# Production — nginx serving the built React app on host port 8080
docker compose -f docker-compose.prod.yml up -d
```

Override `DOCKER_COMPOSE_APP_PORT_PUBLISHED` in `.env` to change the published port.

## Documentation

- [Codec Documentation](docs/CODECS.md) — image, video, and audio codecs used
- [Third-Party Licenses](THIRD_PARTY_LICENSES.md) — codec-related dependencies
- [React Migration Plan](docs/migration-react.md) — phased plan for the React port
