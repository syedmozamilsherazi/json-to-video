import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from '@whop/api';

// Initialize Whop SDK with environment variables
const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.VITE_PUBLIC_WHOP_APP_ID || process.env.WHOP_APP_ID!,
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

  // Extract code and state from query parameters
  const { code, state } = req.query;

  console.log('OAuth callback received:');
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('State:', state);
  console.log('App ID:', process.env.VITE_PUBLIC_WHOP_APP_ID || process.env.WHOP_APP_ID);

  // Validate required parameters
  if (!code) {
    console.error('Missing authorization code');
    return res.redirect('/oauth/error?error=missing_code');
  }

  if (!state) {
    console.error('Missing state parameter');
    return res.redirect('/oauth/error?error=missing_state');
  }

  try {
    // Determine base URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${req.headers.host}` 
      : 'http://localhost:3000';

    console.log('Processing OAuth callback...');
    console.log('Base URL:', baseUrl);

    // Validate state parameter against cookie
    const cookies = req.headers.cookie || '';
    const stateCookieName = `oauth-state-${state}`;
    const stateCookie = cookies
      .split(';')
      .find(cookie => cookie.trim().startsWith(`${stateCookieName}=`));

    if (!stateCookie) {
      console.error('Invalid state parameter - no matching cookie found');
      return res.redirect('/oauth/error?error=invalid_state');
    }

    // Decode state data from cookie
    let stateData: { next: string; timestamp: number };
    try {
      const encodedStateData = stateCookie.split('=')[1];
      const decodedStateData = Buffer.from(encodedStateData, 'base64').toString('utf8');
      stateData = JSON.parse(decodedStateData);
      
      // Check if state has expired (1 hour)
      if (Date.now() - stateData.timestamp > 3600000) {
        console.error('State has expired');
        return res.redirect('/oauth/error?error=state_expired');
      }
    } catch (err) {
      console.error('Failed to decode state data:', err);
      return res.redirect('/oauth/error?error=invalid_state_data');
    }

    console.log('Exchanging code for access token...');
    console.log('Next URL from state:', stateData.next);

    // Determine the correct redirect URI (must match what was used in init)
    let redirectUri: string;
    
    if (baseUrl.includes('localhost')) {
      // Local development callback
      redirectUri = 'http://localhost:8080/oauth/callback';
    } else if (req.headers.host?.includes('json-to-video.vercel.app')) {
      // Production Vercel callback
      redirectUri = 'https://json-to-video.vercel.app/api/oauth-callback';
    } else {
      // Fallback to current host callback
      redirectUri = `${baseUrl}/api/oauth-callback`;
    }

    console.log('Using redirect URI for token exchange:', redirectUri);

    // Exchange the authorization code for access token using Whop SDK
    const authResponse = await whopApi.oauth.exchangeCode({
      code: code as string,
      redirectUri,
    });

    if (!authResponse.ok) {
      console.error('Token exchange failed:', authResponse.code, authResponse.raw?.statusText);
      return res.redirect('/oauth/error?error=token_exchange_failed');
    }

    const { access_token } = authResponse.tokens;
    console.log('Successfully exchanged code for access token');

    // Create user client with access token
    const userClient = WhopServerSdk({
      accessToken: access_token,
      appApiKey: process.env.WHOP_API_KEY!,
      appId: process.env.VITE_PUBLIC_WHOP_APP_ID || process.env.WHOP_APP_ID!,
    });

    // Get user info using the SDK
    const userResponse = await userClient.users.getCurrentUser();
    
    if (!userResponse.ok) {
      console.error('Failed to get user info:', userResponse.code, userResponse.raw?.statusText);
      return res.redirect('/oauth/error?error=failed_to_get_user');
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
      console.warn('Failed to fetch memberships:', membershipsResponse.code, membershipsResponse.raw?.statusText);
      // Don't fail the entire flow if memberships can't be fetched
      hasAccess = false;
    }

    // Set access token in secure HttpOnly cookie
    const accessTokenCookie = `whop_access_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`; // 7 days
    
    // Create session data for frontend
    const sessionData = {
      user_id: userData.id,
      has_access: hasAccess,
      username: userData.username || userData.email,
      avatar_url: userData.avatar_url,
      timestamp: Date.now()
    };
    
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    const sessionCookie = `whop_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`; // 7 days

    // Determine final redirect URL
    const finalRedirectUrl = stateData.next && stateData.next !== '/' ? stateData.next : '/home';
    const redirectUrl = new URL(finalRedirectUrl, baseUrl);
    
    // Add success parameters to URL for frontend processing
    redirectUrl.searchParams.set('auth', 'success');
    redirectUrl.searchParams.set('user_id', userData.id);
    redirectUrl.searchParams.set('has_access', hasAccess.toString());

    console.log('Redirecting to:', redirectUrl.toString());

    // Set multiple cookies and redirect
    res.setHeader('Set-Cookie', [accessTokenCookie, sessionCookie]);
    res.redirect(redirectUrl.toString());

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const errorUrl = `/oauth/error?error=callback_failed&details=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
}
