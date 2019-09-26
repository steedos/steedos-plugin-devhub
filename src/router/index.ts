import * as express from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser'
import * as cors from 'cors'


import * as graphqlHTTP from 'express-graphql'

import schema from './graphql'

const router = express.Router()


router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

router.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: true,
  }),
)


export default router