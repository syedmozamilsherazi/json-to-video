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

  const { code, state } = req.query;

  console.log('OAuth callback received:');
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('State:', state);
  console.log('Client ID:', process.env.WHOP_CLIENT_ID || process.env.WHOP_APP_ID);

  if (!code) {
    console.error('Missing authorization code');
    return res.redirect('/?error=missing_code');
  }

  if (!state) {
    console.error('Missing state parameter');
    return res.redirect('/?error=missing_state');
  }

  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${req.headers.host}` 
      : 'http://localhost:3000';

    // Verify state parameter from cookie
    const cookies = req.headers.cookie || '';
    const stateCookie = cookies
      .split(';')
      .find(cookie => cookie.trim().startsWith(`oauth-state.${state}=`));

    if (!stateCookie) {
      console.error('Invalid state parameter - no matching cookie found');
      return res.redirect('/?error=invalid_state');
    }

    console.log('Exchanging code for access token...');

    // Determine the correct redirect URI based on environment (must match what was used in init)
    const isLocalDev = baseUrl.includes('localhost');
    const redirectUri = isLocalDev 
      ? 'http://localhost:8080/oauth/callback'  // Local development callback
      : `${baseUrl}/api/oauth-callback`;        // Production Vercel callback

    console.log('Using redirect URI for token exchange:', redirectUri);

    // Exchange the authorization code for access token manually
    const clientId = process.env.WHOP_CLIENT_ID || process.env.WHOP_APP_ID;
    const clientSecret = process.env.WHOP_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Missing client credentials');
      return res.redirect('/?error=missing_credentials');
    }
    
    console.log('Using client ID for token exchange:', clientId);
    
    const tokenResponse = await fetch('https://api.whop.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return res.redirect('/?error=code_exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;
    console.log('Successfully exchanged code for access token');

    // Use the WhopSDK to get user information
    const userClient = WhopServerSdk({
      accessToken: access_token,
      appApiKey: process.env.WHOP_API_KEY!,
      appId: process.env.WHOP_APP_ID!,
    });

    // Get user info using the SDK
    const userResponse = await userClient.users.getCurrentUser();
    
    if (!userResponse.ok) {
      console.error('Failed to get user info:', userResponse.code, userResponse.raw.statusText);
      return res.redirect('/?error=failed_to_get_user');
    }

    const userData = userResponse.data;
    console.log('Got user data:', userData.id);

    // Check user's memberships using the SDK
    const membershipsResponse = await userClient.users.getMemberships();
    
    let hasAccess = false;
    if (membershipsResponse.ok) {
      const memberships = membershipsResponse.data;
      console.log('Found memberships:', memberships.length);
      
      // Check if user has any active memberships
      hasAccess = memberships.some((membership: any) => 
        membership.status === 'active' || membership.status === 'trialing'
      );
      
      console.log('User has access:', hasAccess);
    } else {
      console.warn('Failed to fetch memberships:', membershipsResponse.code, membershipsResponse.raw.statusText);
    }

    // Create a secure session token
    const sessionToken = Buffer.from(JSON.stringify({
      access_token,
      user_id: userData.id,
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    })).toString('base64');

    // Restore the `next` parameter from the state cookie
    const next = decodeURIComponent(stateCookie.split('=')[1]);
    const nextUrl = new URL(next || '/', baseUrl);
    
    // Add session info to URL for the frontend to capture
    nextUrl.searchParams.set('token', sessionToken);
    nextUrl.searchParams.set('user_id', userData.id);
    nextUrl.searchParams.set('has_access', hasAccess.toString());

    console.log('Redirecting to:', nextUrl.toString());

    // Set the access token in a secure cookie (following the docs example)
    res.setHeader('Set-Cookie', `whop_access_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`); // 7 days
    res.redirect(nextUrl.toString());

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
}