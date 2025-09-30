import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from "@whop/api";

const whopApi = WhopServerSdk({
  appApiKey: 'vtecLpF8ydpmxsbl3fir5ZhjQiOYYqYnX6Xh2dWZzws',
  appId: 'app_z0Hznij7sCMJGz',
});

export const config = { runtime: 'nodejs20.x' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  console.log('OAuth callback received:');
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('State:', state);

  if (!code) {
    console.error('Missing authorization code');
    return res.redirect('/?error=missing_code');
  }

  if (!state) {
    console.error('Missing state parameter');
    return res.redirect('/?error=missing_state');
  }

  try {
    const baseUrl = req.headers.host?.includes('localhost')
      ? 'http://localhost:3000'
      : `https://${req.headers.host}`;

    // Verify state parameter from cookie
    const cookies = req.headers.cookie || '';
    const stateCookie = cookies
      .split(';')
      .find(cookie => cookie.trim().startsWith(`oauth-state-${state}=`));

    if (!stateCookie) {
      console.error('Invalid state parameter - no matching cookie found');
      return res.redirect('/?error=invalid_state');
    }

    console.log('Exchanging code for access token...');

    // Exchange the authorization code for access token using Whop SDK
    const redirectUri = baseUrl.includes('localhost')
      ? 'http://localhost:8080/oauth/callback'
      : 'https://json-to-video.vercel.app/api/auth/callback';
    const authResponse = await whopApi.oauth.exchangeCode({
      code: code as string,
      redirectUri,
    });

    if (!authResponse.ok) {
      console.error('Token exchange failed:', authResponse.error);
      return res.redirect('/?error=code_exchange_failed');
    }

    const { access_token, refresh_token } = authResponse.tokens;
    console.log('Successfully exchanged code for access token');

    // Use the WhopSDK to get user information
    const userClient = WhopServerSdk({
      userAccessToken: access_token,
      appApiKey: process.env.WHOP_API_KEY!,
      appId: process.env.WHOP_APP_ID!,
    });

    // Get user info using the SDK
    const userResponse = await userClient.users.me();
    
    if (!userResponse.ok) {
      console.error('Failed to get user info:', userResponse.error);
      return res.redirect('/?error=failed_to_get_user');
    }

    const userData = userResponse.data;
    console.log('Got user data:', userData.id);

    // Check user's memberships using the SDK, restricted to the correct product
    const membershipsResponse = await userClient.users.listMemberships();
    let hasAccess = false;
    if (membershipsResponse.ok) {
      const memberships = membershipsResponse.data;
      console.log('Found memberships:', memberships.length);
      hasAccess = memberships.some((membership: any) => {
        const productId = (membership.product && typeof membership.product === 'object') ? membership.product.id : membership.product_id || membership.product;
        return (membership.status === 'active' || membership.status === 'trialing') && productId === 'prod_iZZC4IzX2mi7v';
      });
      console.log('User has access for product prod_iZZC4IzX2mi7v:', hasAccess);
    } else {
      console.warn('Failed to fetch memberships:', membershipsResponse.error);
    }

    // Create a secure session token
    const sessionToken = Buffer.from(JSON.stringify({
      access_token,
      refresh_token,
      user_id: userData.id,
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    })).toString('base64');

    // Restore the `next` parameter from the state cookie (base64 state data)
    const encoded = stateCookie.split('=')[1];
    let next = '/';
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      next = parsed.next || '/';
    } catch {}
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