import * as _ from 'lodash'
import { GraphQLObjectType } from 'graphql'
import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from 'graphql-tools'
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-type-json'

import { db } from '../db'
import {getTokens, getUserId, getUser} from '../objects/devhub_users'

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
    const tokens = getTokens(req)
    const userId = await getUserId(req)
    const spaceId = tokens.spaceId

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

    const user = await db.getObject("devhub_users").findOne(userId, {fields: ["_id"]})
    if (user) {
      await db.getObject("devhub_users").updateOne(userId, {
        name: userId,
        columnIds: columnIds,
        subscriptionIds: subscriptionIds,
      })
    } else {
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

}

const getPlan = async (req: any) => {
  return { 
    "id":"5d88053df1881ef99be58133",
    "source":"none",
    "amount":0,
    "currency":"usd",
    "trialPeriodDays":0,
    "interval":null,
    "intervalCount":1,
    "status":"active",
    "startAt":"2019-09-20T11:47:09.644Z",
    "cancelAt":null,
    "cancelAtPeriodEnd":false,
    "trialStartAt":null,
    "trialEndAt":null,
    "currentPeriodStartAt":"2019-09-20T11:47:09.644Z",
    "currentPeriodEndAt":null,
    "reason":null,
    "featureFlags":{ 
      "columnsLimit":6,
      "enableFilters":true,
      "enableSync":false,
      "enablePrivateRepositories":false,
      "enablePushNotifications":false
    },
    "createdAt":"2019-09-20T11:47:09.644Z",
    "updatedAt":"2019-09-20T11:47:09.644Z"
  } 
}

const getGithub = async (user) => {

  return {
    "app":{ 
      "scope":[ 
      ],
      "token": null,
      "tokenType":"bearer",
      "tokenCreatedAt":"2019-09-21T10:55:32.406Z"
    },
    "oauth":{ 
      "scope":[ 
        "notifications",
        "user:email"
      ],
      "token": user.githubAccessToken,
      "tokenType":"bearer",
      "tokenCreatedAt":"2019-09-21T10:55:33.796Z"
    },
    "user":{ 
      "id": user.githubId,
      "nodeId": user.githubNodeId,
      "login": user.githubLogin,
      "name": user.name,
      "avatarUrl": user.githubAvatarUrl
    }
  }

}

const getMe = async (req: any) => {
  const userId = await getUserId(req)

  const user:any = await getUser(userId)

  if (user == null)
    throw new Error("User not found.")

  const columns:any = await db.getObject("devhub_columns").find({
    filters: [["owner", "=", userId], ["_id", "in", user.columnIds]],
    fields:["name", "type", "subscriptionIds", "filters"]
  })

  const subscriptions:any = await db.getObject("devhub_subscriptions").find({
    filters: [["owner", "=", userId], ["_id", "in", user.subscriptionIds]],
    fields:["name", "type", "subtype"]
  })

  const me = {
    _id: userId,
    columns: [], //columns,
    subscriptions: [], //subscriptions,
    github: getGithub(user),
    plan: getPlan(req),
    createdAt: "2019-09-20T11:47:09.644Z",
    updatedAt: "2019-09-24T06:37:44.974Z",
    lastLoginAt: "2019-09-24T05:37:44.937Z"
  }
  return me;
}
const login = async (
  r: any, 
  params: { 
    [key: string]: any
  }, 
  req: any) => {
    const tokens = getTokens(req)
    return {
      appToken: tokens.spaceToken,
      user: await getMe(req)
    }
}

const schemaResolvers = {
  RootQuery: {
    login: login,
    me: async (r: any, a: { [key: string]: any }, req: any) => await getMe(req),
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
