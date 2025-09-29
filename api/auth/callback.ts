import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    const whopAppId = process.env.WHOP_APP_ID;
    const whopClientSecret = process.env.WHOP_CLIENT_SECRET;
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${req.headers.host}` 
      : 'http://localhost:3000';

    if (!whopAppId || !whopClientSecret) {
      console.error('Missing Whop credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.whop.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: whopAppId,
        client_secret: whopClientSecret,
        code: code as string,
        redirect_uri: `${baseUrl}/auth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange code for token' });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // Get user info
    const userResponse = await fetch('https://api.whop.com/v5/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info');
      return res.status(400).json({ error: 'Failed to get user information' });
    }

    const userData = await userResponse.json();

    // Check user's subscriptions
    const subscriptionsResponse = await fetch('https://api.whop.com/v5/me/memberships', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    let hasAccess = false;
    if (subscriptionsResponse.ok) {
      const subscriptions = await subscriptionsResponse.json();
      // Check if user has any active memberships
      hasAccess = subscriptions.data?.some((membership: any) => 
        membership.status === 'active' || membership.status === 'trialing'
      ) || false;
    }

    // Create a secure session token (you might want to use JWT or similar)
    const sessionToken = Buffer.from(JSON.stringify({
      access_token,
      refresh_token,
      user_id: userData.id,
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    })).toString('base64');

    // Redirect back to app with session info
    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('token', sessionToken);
    redirectUrl.searchParams.set('user_id', userData.id);
    redirectUrl.searchParams.set('has_access', hasAccess.toString());

    res.redirect(redirectUrl.toString());

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}