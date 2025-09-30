import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from "@whop/api";

const whopApi = WhopServerSdk({
  appApiKey: 'vtecLpF8ydpmxsbl3fir5ZhjQiOYYqYnX6Xh2dWZzws',
  appId: 'app_z0Hznij7sCMJGz',
});

export const config = { runtime: 'nodejs' };

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
      let body = '';
      try { body = await (authResponse as any).raw.text(); } catch {}
      const code = (authResponse as any).code;
      console.error('Token exchange failed:', code, body);
      return res.redirect('/?error=code_exchange_failed');
    }

    const { access_token } = authResponse.tokens;
    console.log('Successfully exchanged code for access token');

    // Fetch user via Whop v5
    const userRes = await fetch('https://api.whop.com/v5/me', {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' }
    });
    if (!userRes.ok) {
      const body = await userRes.text();
      console.error('Failed to get user info:', userRes.status, body);
      return res.redirect('/?error=failed_to_get_user');
    }
    const userData = await userRes.json() as any;

    // Fetch memberships via v5
    const memRes = await fetch('https://api.whop.com/v5/me/memberships', {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' }
    });
    let hasAccess = false;
    if (memRes.ok) {
      const data = await memRes.json() as any;
      const memberships: any[] = data.data || [];
      console.log('Memberships payload:', JSON.stringify(memberships.slice(0, 5)));
      hasAccess = memberships.some((m: any) => {
        const pid = (m.product && typeof m.product === 'object' ? m.product.id : m.product) || m.product_id;
        const planId = (m.plan && typeof m.plan === 'object' ? m.plan.id : m.plan) || m.plan_id;
        const statusOk = m.status === 'active' || m.status === 'trialing' || m.status === 'past_due';
        const productMatch = pid === 'prod_iZZC4IzX2mi7v';
        const planMatch = planId === 'plan_0DGjXrTvavvWm';
        if (statusOk && (productMatch || planMatch)) {
          console.log('Matched membership:', { id: m.id, status: m.status, pid, planId });
          return true;
        }
        return false;
      });
    }

    // Create a secure session token
    const sessionToken = Buffer.from(JSON.stringify({
      access_token,
      user_id: userData.id,
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000)
    })).toString('base64');

    // Restore the `next` parameter from the state cookie (base64 state data)
    const encoded = stateCookie.split('=')[1];
    let next = '/';
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      next = parsed.next || '/';
    } catch {}
    // Choose final destination: prefer `next` if provided, else based on access
    const fallbackPath = hasAccess ? '/generator' : '/home';
    const finalPath = next && next !== '/' ? next : fallbackPath;
    const finalUrl = new URL(finalPath, baseUrl);

    // Add session info to URL for the frontend to capture
    finalUrl.searchParams.set('token', sessionToken);
    finalUrl.searchParams.set('user_id', userData.id);
    finalUrl.searchParams.set('has_access', hasAccess.toString());

    console.log('Redirecting to:', finalUrl.toString());

    // Set the access token in a secure cookie (following the docs example)
    res.setHeader('Set-Cookie', `whop_access_token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`); // 7 days
    res.redirect(finalUrl.toString());

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`/?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
}