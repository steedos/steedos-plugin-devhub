# Devhub Server

Host and manage your own devhub server, powered by Steedos Developer Platform.

## Register Github App

First you need to register a github app.

## Config Server

copy .env to .env.local, and config the following environment variables.

```shell
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
MONGO_URL=mongodb://127.0.0.1/steedos
ROOT_URL=http://127.0.0.1:3900
```

## Start Server

```shell
yarn
yarn start
```

## Config client

Fork project https://github.com/devhubapp/devhub

and change the [API_BASE_URL](https://github.com/devhubapp/devhub/blob/master/packages/core/src/utils/constants.ts) to server ROOT_URL in server environment variables.

## Start client

```shell
yarn
yarn dev:web
```
