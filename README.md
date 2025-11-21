# StopClip - Stop Motion App

The [StopClip App](https://kits.blog/) is built with the Ionic framework.

This software was inspired by Stop Motion Animator, a web app developed by [szager](https://github.com/szager/stop-motion). We use components of the BSD0 licensed code.

This is a fork of the [kits GitLab repository](https://gitlab.com/kits-apps/stop-motion-app).

## Prerequirements

- Ionic CLI 7.x.x
- Node 20.x.x

## Main tasks

Task automation is based on yarn scripts and [Ionic scripts](https://ionicframework.com/docs/cli/).

| Tasks      | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| yarn start | Run development server on `http://localhost:4200/` (by default) |
| yarn test  | Run tests                                                       |

## Docker setup

You can use the provided `docker-compose.yml` to start and develop the application:

```
# Start the container:
docker compose up -d

# Access the container:
docker compose exec app bash

# Start the application:
yarn start

# Test the application:
yarn test
```

## Documentation

- [Codec Documentation](docs/CODECS.md) - Information about image, video, and audio codecs used
- [Third-Party Licenses](THIRD_PARTY_LICENSES.md) - License information for codec-related dependencies

## Chromium setup for unit tests

Karma runs the Angular unit tests inside ChromiumHeadless. If the container or host image does not already provide Chromium, run:

```
./scripts/setup-chromium.sh
```

After installation export `CHROMIUM_BIN` so Karma picks up the binary (add this to your shell profile if you run tests frequently):

```
export CHROMIUM_BIN=$(which chromium)
npm run test
```
