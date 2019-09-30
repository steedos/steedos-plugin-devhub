import * as _ from 'lodash'
import { GraphQLObjectType } from 'graphql'
import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from 'graphql-tools'
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-type-json'

import { db } from '../db'
import { me } from '../data'

const schemaConfig = `
  scalar JSON
  scalar JSONObject

  input ColumnInput {
    id: String
    type: String
    filters: JSONObject
    subscriptionIds: [String]
    createdAt: String
    updatedAt: String
  }

  input ColumnSubscriptionInput {
    id: String
    type: String
    subtype: String
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

  type RootMutation {
    replaceColumnsAndSubscriptions(
      columns: [ColumnInput]!
      subscriptions: [ColumnSubscriptionInput]!
      columnsUpdatedAt: String
      subscriptionsUpdatedAt: String
    ): JSONObject
    refreshUserInstallations: JSONObject
  }
  schema {
    query: RootQuery
    mutation: RootMutation
  }
`
const replaceColumnsAndSubscriptions = async (
  r: any, 
  params: { 
    columns: [any]
    subscriptions: [any]
    columnsUpdatedAt: string
    subscriptionsUpdatedAt: string 
  }, 
  req: any) => {
    const userId = await getUserId(req)
    const spaceId = getSpaceId(req)


    const dbcolumns = await db.getObject("devhub_columns").find({
      filters: [["space", "=", spaceId],["owner", "=", userId]],
      fields: ["_id"]
    })
    for (let column of dbcolumns) {
      await db.getObject("devhub_columns").delete(column._id)
    }
    const columnIds = []
    for (let column of params.columns) {
      column.name = column.id
      column.space = spaceId
      column.owner = userId 
      column.created_by = userId
      delete column.id
      const columnId = await db.getObject("devhub_columns").insert(column)
      columnIds.push(columnId._id)
    }


    const dbsubscriptions = await db.getObject("devhub_subscriptions").find({
      filters: [["space", "=", spaceId],["owner", "=", userId]],
      fields: ["_id"]
    })

    for (let sub of dbsubscriptions) {
      await db.getObject("devhub_subscriptions").delete(sub._id)
    }
    const subscriptionIds = []
    for (let subscription of params.subscriptions) {
      subscription.name = subscription.id
      subscription.space = spaceId
      subscription.owner = userId 
      subscription.created_by = userId
      delete subscription.id
      const subscriptionId = await db.getObject("devhub_subscriptions").insert(subscription)
      subscriptionIds.push(subscriptionId._id)
    }

    await db.getObject("devhub_users").delete(userId)
    await db.getObject("devhub_users").insert({
      _id: userId,
      name: userId,
      columnIds: columnIds,
      subscriptionIds: subscriptionIds,
      columnsUpdatedAt: new Date(params.columnsUpdatedAt),
      subscriptionsUpdatedAt: new Date(params.subscriptionsUpdatedAt),
      owner: userId,
      space: spaceId
    })

}

const getAppToken = (req: any) => {
  let appToken = "unknown";
  let authorization = req.headers.authorization;
  if (authorization && authorization.split(' ')[0].toLowerCase() == 'bearer') {
    appToken = authorization.split(' ')[1];
  }
  return appToken
}

const getSpaceId = (req: any) => {
  const appToken = getAppToken(req);
  if (appToken && appToken.split(',').length == 2) {
    return appToken.split(',')[0];
  }
  return null
}

const getAuthToken = (req: any) => {
  const appToken = getAppToken(req);
  let authToken = undefined
  if (appToken && appToken.split(',').length == 2) {
    return appToken.split(',')[1];
  }
  return null
}

const getUserId = async (req: any) => {
  const authToken = getAuthToken(req)
  const sessions:any = await db.getObject("sessions").find({
    filters: [["token", "=", authToken]],
    fields:["userId"]
  })
  if (sessions && sessions[0])
    return sessions[0].userId
  return null
}

const login = async (
  r: any, 
  params: { 
    [key: string]: any
  }, 
  req: any) => {
    return {
      appToken: getAppToken(req),
      user: me()
    }
}

const schemaResolvers = {
  RootQuery: {
    login: login,
    me: (r: any, a: { [key: string]: any }, ctx: any) => me(),
  },
  RootMutation: {
    replaceColumnsAndSubscriptions: replaceColumnsAndSubscriptions,
  }
}

const schema = makeExecutableSchema({
  typeDefs: schemaConfig,
  resolvers: schemaResolvers,
})

export default schema
