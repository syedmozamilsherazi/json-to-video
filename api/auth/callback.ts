import type { VercelRequest, VercelResponse } from '@vercel/node';
import oauthHandler from '../oauth/callback.js';

// Match Whop's configured redirect URI and delegate to the main OAuth callback handler.
export default async function authCallback(req: VercelRequest, res: VercelResponse) {
  return oauthHandler(req, res);
}
