import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple proxy that forwards to the unified OAuth callback under /api/oauth/callback
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const baseUrl = req.headers.host?.includes('localhost')
    ? 'http://localhost:3000'
    : `https://${req.headers.host}`;

  const url = new URL('/api/oauth/callback', baseUrl);
  for (const [k, v] of Object.entries(req.query)) {
    if (Array.isArray(v)) {
      v.forEach((vv) => url.searchParams.append(k, vv));
    } else if (v != null) {
      url.searchParams.set(k, String(v));
    }
  }
  res.redirect(url.toString());
}
import type { VercelRequest, VercelResponse } from '@vercel/node';
import oauthHandler from '../oauth/callback.js';

// This endpoint exists to match the redirect URI configured in Whop Dashboard:
// https://json-to-video.vercel.app/api/auth/callback
// It simply delegates to the main OAuth callback handler.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return oauthHandler(req, res);
}
