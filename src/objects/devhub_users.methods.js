import {users} from './devhub_users';

export const updateUser = async (req, res) => {
  const userId = getUserId(req)
  const user = await users.updateOne(userId, req.body);
  res.end(user);
}

export const getUser = async (req,  res) => {
  const userId = getUserId(req)
  const user = await users.findOne(userId);
  res.end(user);
}