import type { VercelRequest, VercelResponse } from '@vercel/node';

// Hardcoded Whop API key and product ID per user request
const WHOP_API_KEY = 'vtecLpF8ydpmxsbl3fir5ZhjQiOYYqYnX6Xh2dWZzws';
const ACCESS_PASS_PRODUCT_ID = 'prod_iZZC4IzX2mi7v';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id in request body' });
    }

    console.log('Checking membership for user:', user_id);
    console.log('Access pass product ID:', ACCESS_PASS_PRODUCT_ID);

    // Use Whop REST API v2 to check memberships for this user and product
    const url = `https://api.whop.com/v2/memberships?user_id=${encodeURIComponent(user_id)}&product_id=${encodeURIComponent(ACCESS_PASS_PRODUCT_ID)}&valid=true`;
    console.log('Membership check URL:', url);

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('Failed to fetch memberships:', resp.status, resp.statusText, text);
      return res.status(200).json({
        error: 'Failed to check membership status',
        hasAccess: false
      });
    }

    const data = await resp.json() as { data?: any[] };
    const list = Array.isArray(data?.data) ? data.data : [];
    console.log(`Found ${list.length} valid memberships for user ${user_id}`);

    // Check if any valid memberships returned
    const hasAccess = list.length > 0;

    console.log('User has access:', hasAccess);

    return res.status(200).json({
      hasAccess,
      userId: user_id,
      membershipCount: (Array.isArray((data as any)?.data) ? (data as any).data.length : 0),
      productId: ACCESS_PASS_PRODUCT_ID
    });

  } catch (error: any) {
    console.error('Membership check error:', error);
    res.status(500).json({ 
      error: 'Internal server error checking membership',
      hasAccess: false,
      details: error.message 
    });
  }
}