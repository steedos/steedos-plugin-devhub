# Devhub Server

The [devhub](https://github.com/devhubapp/devhub) project is great! We work on this plugin so we can host our own server.

More importantly, we are working on a enterprise notification center project, not only for github, but for salesforce, sap and much more systems.

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

Fork project https://github.com/devhubapp/devhub.

Open [constants.ts](https://github.com/devhubapp/devhub/blob/master/packages/core/src/utils/constants.ts) , change the API_BASE_URL variable from 'https://api.devhubapp.com' to ROOT_URL in server environment variables.

## Start client

```shell
yarn
yarn dev:web
```
