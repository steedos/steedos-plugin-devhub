import * as dotenv from 'dotenv-flow'
dotenv.config()

import * as server from '@steedos/meteor-bundle-runner';
import * as steedos from '@steedos/core'

import oauthRouter from './oauth'
import router from './router'

declare var WebApp;

server.Fiber(function () {
  try {
    server.Profile.run("Server startup", function () {
      server.loadServerBundles();
      steedos.init();

      const app = WebApp.rawConnectHandlers
      app.use(oauthRouter)
      app.use(router)
      
      server.callStartupHooks();
      server.runMain();

    })
  } catch (error) {
    console.error(error.stack)
  }
}).run()
