FROM node:18-bookworm as base

USER node
WORKDIR /home/node/app

FROM base as development
USER root
RUN set -eux ; \
  apt-get update && apt-get install -y \
  chromium \
  chromium-driver \
  python3 \
  && rm -rf /var/lib/apt/lists/*

USER node

# Set up Chromium Headless flags
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/lib/chromium/

COPY --chown=node:node package.json yarn.lock ./

RUN yarn install

FROM base as production_builder

USER root

# Copy project files into the docker image
COPY --chown=node:node . ./

# Install app dependencies
RUN yarn install
RUN yarn build:prod

FROM nginxinc/nginx-unprivileged:stable-alpine AS production

## From 'builder' copy website to default nginx public folder
COPY --from=production_builder /home/node/app/www /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]