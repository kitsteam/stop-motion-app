FROM node:22.6-bullseye as base

USER node
WORKDIR /home/node/app

FROM base as development

# install chromium for karma:
USER root
RUN set -eux ; \
  apt-get update && apt-get install -y \
  chromium \
  chromium-driver \
  && rm -rf /var/lib/apt/lists/*
USER node

# Set up Chromium Headless flags
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/lib/chromium/

COPY --chown=node:node package.json yarn.lock ./

RUN yarn install

FROM base as production_builder
# copy and yarn install package file first to make use of docker caching:
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install

# Copy rest of the project files into the docker image
COPY --chown=node:node . ./

# Install app dependencies
RUN yarn install
RUN yarn build:prod

FROM nginxinc/nginx-unprivileged:1.25.4-alpine3.18-slim AS production

# Copy config file:
COPY config/nginx/default.conf /etc/nginx/conf.d/default.conf

## From 'builder' copy website to default nginx public folder
COPY --from=production_builder /home/node/app/www /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]