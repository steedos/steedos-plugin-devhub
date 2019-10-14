import {db} from '../db';

export const updateUser = async (req, res) => {
  const userId = getUserId(req)
  const user = await db.getObject("devhub_users").updateOne(userId, req.body);
  res.end(user);
}

export const getUser = async (req,  res) => {
  const userId = getUserId(req)
  const user = await db.getObject("devhub_users").findOne(userId);
  res.end(user);
}