import * as _ from 'lodash'
import { GraphQLObjectType } from 'graphql'
import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from 'graphql-tools'
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-type-json'

import { db, getTokens, getUserId, getSpaceId, getUser, 
         createOrUpdateUser, createOrUpdateColumn, createOrUpdateSubscription } from '../db'
import { MeteorODataAPIV4Router } from '@steedos/core'

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
    objects: JSONObject
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
    const spaceId = await getSpaceId(req)

    const columnIds = []
    for (let column of params.columns) {
      columnIds.push(column.id)
      column.name = column.id
      column.space = spaceId
      column.owner = userId 
      column.created_by = userId
      const id = column.id
      delete column.id
      createOrUpdateColumn(id, column)
    }
    const dbColumns = await db.getObject("devhub_columns").find({
      filters: [["owner", "=", userId], ["space", "=", spaceId]],
    })
    for (let col of dbColumns) {
      if (columnIds.indexOf(col.name)<0) {
        db.getObject("devhub_columns").delete(col.name)
      }
    }

    const subscriptionIds = []
    for (let subscription of params.subscriptions) {
      subscriptionIds.push(subscription.id)
      subscription.name = subscription.id
      subscription.space = spaceId
      subscription.owner = userId 
      subscription.created_by = userId
      const id = userId + "-" + Buffer.from(subscription.id).toString('base64').split("/").join("-")
      delete subscription.id
      createOrUpdateSubscription(id, subscription)
    }
    const dbSubscriptions = await db.getObject("devhub_subscriptions").find({
      filters: [["owner", "=", userId], ["space", "=", spaceId]],
    })
    for (let sub of dbSubscriptions) {
      if (subscriptionIds.indexOf(sub.name)<0) {
        let id = userId + "-" + Buffer.from(sub.name).toString('base64').split("/").join("-")
        db.getObject("devhub_subscriptions").delete(id)
      }
    }

    createOrUpdateUser(userId, spaceId, {
      columnIds: columnIds,
      subscriptionIds: subscriptionIds,
      columnsUpdatedAt: new Date(params.columnsUpdatedAt),
      subscriptionsUpdatedAt: new Date(params.subscriptionsUpdatedAt),
    })

    return true
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
  const spaceId = await getSpaceId(req)

  const user:any = await getUser(userId, spaceId)

  if (user == null)
    throw new Error("User not found.")

  let columns = {
    allIds: [],
    byId: {},
    updatedAt: user.columnsUpdatedAt,
  }
  if (user.columnIds && user.columnIds.length>0) {
    columns.allIds = user.columnIds
    const dbColumns = await db.getObject("devhub_columns").find({
      filters: [["owner", "=", userId], ["_id", "in", user.columnIds]],
    })
    for (let item of dbColumns) {
      columns.byId[item._id] = {
        id: item._id,
        type: item.type,
        subscriptionIds: item.subscriptionIds,
        filters: item.filters,
        createdAt: item.created,
        updatedAt: item.modified,
      }
    }
  }

  let subscriptions = {
    allIds: [],
    byId: {},
    updatedAt: user.subscriptionsUpdatedAt,
  }
  if (user.subscriptionIds && user.subscriptionIds.length>0) {
    subscriptions.allIds = user.subscriptionIds
    const dbSubscriptions = await db.getObject("devhub_subscriptions").find({
      filters: [["owner", "=", userId]],
    })
    for (let item of dbSubscriptions) {
      subscriptions.byId[item.name] = {
        id: item.name,
        type: item.type,
        subtype: item.subtype,
        params: item.params,
        createdAt: item.created,
        updatedAt: item.modified,
      }
      if (item.type === 'steedos_object' && db.getObject(item.subtype)) {
        subscriptions.byId[item.name].object = db.getObject(item.subtype).toConfig()
      }
    }
  }

  const me = {
    _id: user._id,
    columns: columns,
    subscriptions: subscriptions,
    github: getGithub(user),
    plan: getPlan(req),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
  console.log(me)
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
