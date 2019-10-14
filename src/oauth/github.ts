import * as express from 'express'
import * as oauth from 'oauth'
import { fetchUrl } from 'fetch'

import { getTokens, getUserId, updateUser } from '../objects/devhub_users.object';

const router = express.Router()

const GITHUB_OAUTH_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID
const GITHUB_OAUTH_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET
let ROOT_URL = process.env.ROOT_URL


if (
  !GITHUB_OAUTH_CLIENT_ID ||
  !GITHUB_OAUTH_CLIENT_SECRET ||
  !ROOT_URL
)
  throw new Error(
    'Missing required environment variables: ROOT_URL, GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET',
  )

if (!ROOT_URL.endsWith('/')) ROOT_URL = ROOT_URL + '/'

const oauth2 = new oauth.OAuth2(
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET,
  'https://github.com/',
  'login/oauth/authorize',
  'login/oauth/access_token',
  undefined,
) /** Custom headers */

router.get('/github/oauth', async (req: express.Request, res: express.Response) => {
  let userId = await getUserId(req);
  const authURL = oauth2.getAuthorizeUrl({
    redirect_uri: ROOT_URL + 'github/callback',
    scope: ['repo,notifications,user'],
    state: 'steedos',
  })
  console.log(authURL)
  res.redirect(authURL)
  res.end()
})

router.get(
  '/github/callback',
  async (req: express.Request, res: express.Response) => {
    let tokens = getTokens(req)
    if (!tokens) {
      res.end("Please sign in to steedos first.");
      return
    }
    let userId = await getUserId(req);

    const code = req.query.code
    oauth2.getOAuthAccessToken(
      code,
      { grant_type: 'client_credentials' },
      async (e: any, accessToken: string, refreshToken: string, results: any) => {

        if (e) {
          console.log(e);
          res.end(e);
          return
        } else if (results.error) {
          console.log(results);
          res.end(JSON.stringify(results));
          return
        }
     
        fetchUrl('https://api.github.com/user', {
          headers: {
            "Authorization": "token " + accessToken
          }
        }, async (error, meta, body) => {
          const github = JSON.parse(body.toString());
          
          const user = await updateUser(userId, {
            githubId: github.id,
            githubNodeId: github.node_id,
            githubLogin: github.login,
            name: github.name,
            githubAvatarUrl: github.avatar_url,
            githubAccessToken: accessToken,
            githubAccessTokenCreatedAt: new Date(),
            githubRefreshToken: refreshToken
          })
          const data = {
            app_token: tokens.spaceToken,
            github_token: accessToken,
          }
          res.end(
            '<script>window.opener.postMessage(' +
              JSON.stringify(data) +
              ", '*');window.close()</script>",
          )
        })
      },
    )
  },
)

export default router
