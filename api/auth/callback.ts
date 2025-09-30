import type { VercelRequest, VercelResponse } from '@vercel/node';
import oauthHandler from '../oauth/callback.js';

// This endpoint exists to match the redirect URI configured in Whop Dashboard:
// https://json-to-video.vercel.app/api/auth/callback
// It simply delegates to the main OAuth callback handler.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return oauthHandler(req, res);
}
