import { GraphQLObjectType } from 'graphql'
import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from 'graphql-tools'
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-type-json'

import { login, me } from '../data'

const schemaConfig = `
  scalar JSON
  scalar JSONObject

  type Column {
    id: String
    type: String
    filters: JSONObject
    subscriptionIds: [String]
    createdAt: String
    updatedAt: String
  }

  type Subscription {
    id: String
    type: String
    substype: String
    params: JSONObject
    createdAt: String
    updatedAt: String
  }

  type User {
    _id: String
    columns: JSONObject
    subscriptions: JSONObject
    plan: Plan
    github: Github
    createdAt: String
    updatedAt: String
    lastLoginAt: String
  }

  type Github {
    app: GithubApp
    oauth: GithubOAuth
    user: GithubUser
  }

  type GithubApp {
    scope: [String]
    token: String
    tokenCreatedAt: String
    tokenType: String
  }

  type GithubOAuth {
    scope: [String]
    token: String
    tokenCreatedAt: String
    tokenType: String
  }

  type GithubUser {
    id: String
    name: String
    login: String
    nodeId: String
    avatarUrl: String
  }

  type PlanFeatureFlags {
    columnsLimit: Int
    enableFilters: Boolean
    enablePrivateRepositories: Boolean
    enablePushNotifications: Boolean
    enableSync: Boolean
  }

  type Plan {
    amount: Int
    cancelAt: String
    cancelAtPeriodEnd: Boolean
    createdAt: String
    currency: String
    currentPeriodEndAt: String
    currentPeriodStartAt: String
    featureFlags: PlanFeatureFlags
    id: String
    interval: Int
    intervalCount: Int
    reason: String
    source: String
    startAt: String
    status: String
    trialEndAt: String
    trialPeriodDays: Int
    trialStartAt: String
    updatedAt: String
  }

  type Login {
    appToken: String
    user: User
  }

  type RootQuery {
    login: Login
    me: User
  }
  schema {
    query: RootQuery
  }
`

const schemaResolvers = {
  RootQuery: {
    login: (r: any, a: { [key: string]: any }, ctx: any) => login(),
    me: (r: any, a: { [key: string]: any }, ctx: any) => me(),
  },
}

const schema = makeExecutableSchema({
  typeDefs: schemaConfig,
  resolvers: schemaResolvers,
})

export default schema
