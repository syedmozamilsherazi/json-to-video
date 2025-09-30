import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check all Whop-related environment variables
  const envCheck = {
    WHOP_API_KEY: process.env.WHOP_API_KEY ? 'Present' : 'Missing',
    WHOP_APP_ID: process.env.WHOP_APP_ID ? 'Present' : 'Missing', 
    WHOP_CLIENT_ID: process.env.WHOP_CLIENT_ID ? 'Present' : 'Missing',
    WHOP_CLIENT_SECRET: process.env.WHOP_CLIENT_SECRET ? 'Present' : 'Missing',
    WHOP_ACCESS_PASS_ID: process.env.WHOP_ACCESS_PASS_ID ? 'Present' : 'Missing',
    // Don't log actual values for security
    NODE_ENV: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };

  console.log('Environment check:', envCheck);

  return res.status(200).json({
    message: 'Environment variables check',
    environment: envCheck,
    // Show first few characters for verification (security safe)
    whop_app_id_preview: process.env.WHOP_APP_ID ? process.env.WHOP_APP_ID.substring(0, 8) + '...' : 'Missing',
    whop_api_key_preview: process.env.WHOP_API_KEY ? process.env.WHOP_API_KEY.substring(0, 8) + '...' : 'Missing'
  });
}