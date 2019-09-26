import * as dotenv from 'dotenv-flow'
dotenv.config()

import * as server from '@steedos/meteor-bundle-runner';
import * as steedos from '@steedos/core'
import * as cors from 'cors'

import oauthRouter from './oauth'
import router from './router'

declare var WebApp;

server.Fiber(function () {
  try {
    server.Profile.run("Server startup", function () {
      server.loadServerBundles();
      WebApp.rawConnectHandlers.use(cors({origin: true}))
      steedos.init();

      WebApp.rawConnectHandlers.use(oauthRouter)
      WebApp.rawConnectHandlers.use(router)
      
      server.callStartupHooks();
      server.runMain();

    })
  } catch (error) {
    console.error(error.stack)
  }
}).run()
