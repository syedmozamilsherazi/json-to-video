import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from "@whop/api";

const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.WHOP_APP_ID!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { next = "/" } = req.query;
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${req.headers.host}` 
      : 'http://localhost:3000';

    console.log('Initializing OAuth flow...');
    console.log('Base URL:', baseUrl);
    console.log('App ID:', process.env.WHOP_APP_ID);

    // Determine the correct redirect URI based on environment
    const isLocalDev = baseUrl.includes('localhost');
    const redirectUri = isLocalDev 
      ? 'http://localhost:8080/oauth/callback'  // Local development callback
      : `${baseUrl}/api/oauth-callback`;        // Production Vercel callback

    console.log('Using redirect URI:', redirectUri);

    const { url, state } = whopApi.oauth.getAuthorizationUrl({
      // This has to match the redirect URI configured in Whop Dashboard
      redirectUri,
      // Authorization scopes - using the ones we need
      scope: ["read_user"] as any,
    });

    console.log('OAuth Authorization URL:', url);
    console.log('OAuth State:', state);

    // Store state securely in a cookie for CSRF protection
    const stateValue = encodeURIComponent(next as string);
    const cookieValue = `oauth-state.${state}=${stateValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;

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