ARG NODE_VERSION=22
ARG ALPINE_VERSION=3.21
ARG PNPM_VERSION=11.3.0
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

COPY --chown=node:node react-app/package.json react-app/pnpm-lock.yaml ./react-app/
RUN pnpm --dir react-app install --frozen-lockfile

COPY --chown=node:node react-app ./react-app/
RUN pnpm --dir react-app run build


FROM base AS development

COPY --chown=node:node react-app/package.json react-app/pnpm-lock.yaml ./react-app/
RUN pnpm --dir react-app install --frozen-lockfile


FROM ${NGINX_IMAGE} AS production

COPY config/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /home/node/app/react-app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
