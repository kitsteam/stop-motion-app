FROM node:18-buster as base

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

#USER node
# Set up Chromium Headless flags
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROME_PATH=/usr/lib/chromium/

COPY --chown=node:node package.json yarn.lock ./

RUN yarn install

FROM base as production_builder

USER node

# Install app dependencies
COPY package.json /a
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install
# Copy project files into the docker image
COPY . ./
RUN yarn build:prod

FROM nginx:alpine as production

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

## From 'builder' copy website to default nginx public folder
COPY --from=production_builder /home/node/app/www /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]