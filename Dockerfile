ARG NODE_VERSION=22
ARG ALPINE_VERSION=3.21
ARG PNPM_VERSION=11.3.0
ARG YARN_VERSION=4.12.0
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.29.2-alpine3.22-slim
# Switch with --build-arg APP_FLAVOR=react during the coexistence window.
ARG APP_FLAVOR=angular

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ENV APP_PATH=/home/node/app
WORKDIR $APP_PATH

# Skip corepack's interactive TOFU prompt so non-interactive builds can
# fetch the package managers declared in each app's `packageManager` field.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable \
 && chown node:node $APP_PATH

USER node

ARG PNPM_VERSION
ARG YARN_VERSION
# The repo ships two apps during the React migration coexistence window:
# Angular (yarn 4) at the repo root, React (pnpm) under react-app/.
# Pre-activate both so neither flavor has to download a package manager
# at install time.
RUN corepack prepare yarn@${YARN_VERSION} --activate \
 && corepack prepare pnpm@${PNPM_VERSION} --activate


# ---------------------------------------------------------------------------
# Angular flavor (default during the React migration coexistence window)
# ---------------------------------------------------------------------------

FROM base AS development_angular

USER root
# Karma launches headless Chromium for unit tests.
RUN apk add --no-cache chromium chromium-chromedriver
USER node

ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/

COPY --chown=node:node package.json yarn.lock ./
RUN yarn install


FROM base AS builder_angular

COPY --chown=node:node package.json yarn.lock ./
RUN yarn install

COPY --chown=node:node . ./
RUN yarn install \
 && yarn build:prod
# ng build outputs to $APP_PATH/www


# ---------------------------------------------------------------------------
# React flavor (opt in with --build-arg APP_FLAVOR=react)
# ---------------------------------------------------------------------------

FROM base AS development_react

COPY --chown=node:node react-app/package.json react-app/pnpm-lock.yaml ./react-app/
WORKDIR $APP_PATH/react-app
RUN pnpm install --frozen-lockfile
WORKDIR $APP_PATH


FROM base AS builder_react

COPY --chown=node:node react-app/package.json react-app/pnpm-lock.yaml ./react-app/
WORKDIR $APP_PATH/react-app
RUN pnpm install --frozen-lockfile

COPY --chown=node:node react-app/ ./
RUN pnpm build \
 && mv dist $APP_PATH/www
WORKDIR $APP_PATH


# ---------------------------------------------------------------------------
# Flavor selection — driven by the global APP_FLAVOR build-arg above.
# ---------------------------------------------------------------------------

FROM development_${APP_FLAVOR} AS development
FROM builder_${APP_FLAVOR} AS builder


# ---------------------------------------------------------------------------
# Production runtime (flavor-agnostic)
# ---------------------------------------------------------------------------

FROM ${NGINX_IMAGE} AS production

COPY config/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /home/node/app/www /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
