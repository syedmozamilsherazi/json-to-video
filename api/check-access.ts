import type { VercelRequest, VercelResponse } from '@vercel/node';
// Removed SDK import; using HTTP v5 session flow only

interface SessionData {
  access_token: string;
  refresh_token?: string;
  user_id: string;
  expires_at: number;
}

const PRODUCT_ID = 'prod_iZZC4IzX2mi7v';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    console.log('Checking access for token:', token ? 'Token provided' : 'No token');

    if (!token) {
      return res.status(400).json({ error: 'No token provided', hasAccess: false });
    }

    const sessionData: SessionData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    if (Date.now() > sessionData.expires_at) {
      return res.status(200).json({ hasAccess: false, error: 'Session expired', expired: true });
    }

    // Verify using v5 API with the user's access token
    const userResponse = await fetch('https://api.whop.com/v5/me', {
      headers: { 'Authorization': `Bearer ${sessionData.access_token}`, 'Content-Type': 'application/json' }
    });
    if (!userResponse.ok) {
      return res.status(200).json({ hasAccess: false, error: 'Invalid session' });
    }
    const userData = await userResponse.json();

    const membershipsResponse = await fetch('https://api.whop.com/v5/me/memberships', {
      headers: { 'Authorization': `Bearer ${sessionData.access_token}`, 'Content-Type': 'application/json' }
    });

    let hasAccess = false;
    let memberships: any[] = [];
    if (membershipsResponse.ok) {
      const membershipsData = await membershipsResponse.json();
      memberships = membershipsData.data || [];
      hasAccess = memberships.some((m: any) => {
        const pid = (m.product && typeof m.product === 'object' ? m.product.id : m.product) || m.product_id;
        const planId = (m.plan && typeof m.plan === 'object' ? m.plan.id : m.plan) || m.plan_id;
        const statusOk = m.status === 'active' || m.status === 'trialing' || m.status === 'past_due';
        return statusOk && (pid === PRODUCT_ID || planId === 'plan_0DGjXrTvavvWm');
      });
    }

    return res.status(200).json({ 
      hasAccess,
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        avatar_url: userData.avatar_url
      },
      memberships
    });

  } catch (error: any) {
    console.error('Access check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      hasAccess: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
