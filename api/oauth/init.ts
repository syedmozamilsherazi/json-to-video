import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from "@whop/api";

const whopApi = WhopServerSdk({
  appApiKey: 'vtecLpF8ydpmxsbl3fir5ZhjQiOYYqYnX6Xh2dWZzws',
  appId: 'app_z0Hznij7sCMJGz',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { next = "/" } = req.query;
    const baseUrl = req.headers.host?.includes('localhost')
      ? 'http://localhost:3000'
      : `https://${req.headers.host}`;

    console.log('Initializing OAuth flow...');
    console.log('Base URL:', baseUrl);

    // Use /api/oauth/callback locally, and the Whop-configured /api/auth/callback in production
    const redirectUri = baseUrl.includes('localhost')
      ? `${baseUrl}/api/oauth/callback`
      : 'https://json-to-video.vercel.app/api/auth/callback';
    const { url, state } = whopApi.oauth.getAuthorizationUrl({
      redirectUri,
      scope: ["read_user"],
    });

    console.log('OAuth Authorization URL:', url);
    console.log('OAuth State:', state);

    // Store state securely in a cookie for CSRF protection
    const stateValue = encodeURIComponent(next as string);
    const cookieValue = `oauth-state-${state}=${Buffer.from(JSON.stringify({ next: next as string, timestamp: Date.now() })).toString('base64')}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;

    // Redirect to Whop's OAuth authorization page
    res.setHeader('Set-Cookie', cookieValue);
    res.redirect(url);

  } catch (error: any) {
    console.error('OAuth initialization error:', error);
    res.status(500).json({ 
      error: 'Failed to initialize OAuth flow',
      details: error.message 
    });
  }
}