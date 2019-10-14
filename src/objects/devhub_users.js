import { getSteedosSchema } from '@steedos/objectql';
import * as Cookies from 'cookies';

const db = getSteedosSchema()

export const getTokens = (req) => {
  let spaceToken = null;
  let authorization = req.headers.authorization;
  if (authorization && authorization.split(' ')[0].toLowerCase() == 'bearer') {
    spaceToken = authorization.split(' ')[1];
  }
  if (!spaceToken) {
    let cookies = new Cookies(req, {});
    spaceToken = cookies.get("X-Space-Token");
  }
  if (!spaceToken) {
    return null
  }
  if (spaceToken && spaceToken.split(',').length == 2) {
    const spaceId = spaceToken.split(',')[0];
    const authToken = spaceToken.split(',')[1];
    return {
      spaceId: spaceId,
      authToken: authToken,
      spaceToken: spaceToken
    }
  }
  return null
}

export const getUserId = async (req) => {
  if (req.userId)
    return req.userId
  const tokens = getTokens(req)
  const sessions = await db.getObject("sessions").find({
    filters: [["token", "=", tokens.authToken]],
    fields:["userId"]
  })
  if (sessions && sessions[0]){
    req.userId = sessions[0].userId
    return req.userId
  }
  return null
}

export const updateUser = async (userId, user) => {
  return await db.getObject("devhub_users").updateOne(userId, user);
}

export const getUser = async (userId) => {
  return await db.getObject("devhub_users").findOne(userId);
}