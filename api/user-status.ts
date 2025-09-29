import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper to parse cookies
function parseCookies(cookieHeader?: string) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...val] = cookie.trim().split('=');
    cookies[name] = val.join('=');
  });
  return cookies;
}

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
    // Parse cookies from request
    const cookies = parseCookies(req.headers.cookie);
    
    const isLoggedIn = cookies.whop_logged_in === 'true';
    const userId = cookies.whop_user_id || null;
    const hasAccess = cookies.whop_has_access === 'true';

    console.log('User status check:', { isLoggedIn, userId: userId ? 'present' : 'missing', hasAccess });

    return res.status(200).json({
      isLoggedIn,
      userId,
      hasAccess,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('User status check error:', error);
    return res.status(500).json({
      error: 'Failed to check user status',
      isLoggedIn: false,
      userId: null,
      hasAccess: false
    });
  }
}