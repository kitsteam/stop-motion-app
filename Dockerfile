ARG NODE_VERSION=24
ARG ALPINE_VERSION=3.21
ARG PNPM_VERSION=10.33.4
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.29.2-alpine3.22-slim

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

ENV APP_PATH=/home/node/app
WORKDIR $APP_PATH

RUN corepack enable \
 && chown node:node $APP_PATH

USER node

ARG PNPM_VERSION
RUN corepack prepare pnpm@${PNPM_VERSION} --activate


FROM base AS builder

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node scripts/generate-notices.mjs ./scripts/generate-notices.mjs
COPY --chown=node:node NOTICES.txt ./
COPY --chown=node:node index.html eslint.config.js tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts vitest.config.ts ./
RUN pnpm run build \
 && (pnpm run generate:notices \
       || echo "WARNING: NOTICES regeneration failed; shipping committed backup")


FROM base AS development

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile


FROM ${NGINX_IMAGE} AS production

COPY config/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /home/node/app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx LICENSE /usr/share/nginx/html/
COPY --from=builder --chown=nginx:nginx /home/node/app/NOTICES.txt /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]
