import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from '@whop/api';

// Hardcoded Whop credentials and access pass product ID
const WHOP_API_KEY = 'vtecLpF8ydpmxsbl3fir5ZhjQiOYYqYnX6Xh2dWZzws';
const WHOP_APP_ID = 'app_z0Hznij7sCMJGz';
const ACCESS_PASS_PRODUCT_ID = 'prod_iZZC4IzX2mi7v'; // Your access pass product ID

// Initialize Whop SDK
const whopApi = WhopServerSdk({
  appApiKey: WHOP_API_KEY,
  appId: WHOP_APP_ID,
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

    // Check if user has an active membership for the access pass product using Whop SDK
    const membershipResponse = await whopApi.memberships.list({
      user: user_id,
      product: ACCESS_PASS_PRODUCT_ID,
    });

    if (!membershipResponse.ok) {
      console.error('Failed to fetch memberships:', membershipResponse.code, membershipResponse.raw?.statusText);
      return res.status(500).json({ 
        error: 'Failed to check membership status',
        hasAccess: false 
      });
    }

    const memberships = membershipResponse.data;
    console.log(`Found ${memberships.length} memberships for user ${user_id}`);

    // Check if user has any active or trialing memberships for this product
    const hasAccess = memberships.some((membership: any) => 
      (membership.status === 'active' || membership.status === 'trialing') &&
      membership.product === ACCESS_PASS_PRODUCT_ID
    );

    console.log('User has access:', hasAccess);

    return res.status(200).json({
      hasAccess,
      userId: user_id,
      membershipCount: memberships.length,
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