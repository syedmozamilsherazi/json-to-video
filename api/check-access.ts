import type { VercelRequest, VercelResponse } from '@vercel/node';
import Whop from '@whop/api';

interface SessionData {
  access_token: string;
  refresh_token?: string;
  user_id: string;
  expires_at: number;
}

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

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(400).json({ 
        error: 'No token provided', 
        hasAccess: false 
      });
    }

    // For testing purposes, allow a simple test token
    if (token === 'test-token') {
      return res.status(200).json({ 
        hasAccess: true,
        message: 'Test access granted',
        user: {
          id: 'test-user',
          email: 'test@example.com'
        }
      });
    }

    try {
      // Try to decode as session token first
      const sessionData: SessionData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      
      // Check if session is expired
      if (Date.now() > sessionData.expires_at) {
        return res.status(200).json({ 
          hasAccess: false, 
          error: 'Session expired',
          expired: true
        });
      }

      // Use the access token to verify with Whop
      const userResponse = await fetch('https://api.whop.com/v5/me', {
        headers: {
          'Authorization': `Bearer ${sessionData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.error('Failed to verify user with Whop API');
        return res.status(200).json({ 
          hasAccess: false, 
          error: 'Invalid session'
        });
      }

      const userData = await userResponse.json();
      console.log('User data retrieved:', userData.id);
      
      // Check user's memberships
      const membershipsResponse = await fetch('https://api.whop.com/v5/me/memberships', {
        headers: {
          'Authorization': `Bearer ${sessionData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      let hasAccess = false;
      let memberships = [];

      if (membershipsResponse.ok) {
        const membershipsData = await membershipsResponse.json();
        memberships = membershipsData.data || [];
        console.log('Memberships found:', memberships.length);
        
        hasAccess = memberships.some((membership: any) => 
          membership.status === 'active' || membership.status === 'trialing'
        );
      } else {
        console.warn('Failed to fetch memberships');
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

    } catch (decodeError) {
      console.log('Failed to decode session token, trying legacy methods');
      
      // Fallback 1: Try to use token directly as bearer token
      try {
        const userCheck = await fetch('https://api.whop.com/v5/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (userCheck.ok) {
          const userData = await userCheck.json();
          console.log('User data retrieved via direct token:', userData.id);
          
          // Check user's memberships
          const membershipsCheck = await fetch('https://api.whop.com/v5/me/memberships', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          let hasAccess = false;
          let memberships = [];

          if (membershipsCheck.ok) {
            const membershipsData = await membershipsCheck.json();
            memberships = membershipsData.data || [];
            
            hasAccess = memberships.some((membership: any) => 
              membership.status === 'active' || membership.status === 'trialing'
            );
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
        }
      } catch (directTokenError) {
        console.log('Direct token failed, trying SDK method');
      }

      // Fallback 2: Try using Whop SDK (legacy method)
      try {
        const whop = new Whop({
          apiKey: process.env.WHOP_API_KEY as string,
        });

        const { user_id } = await whop.auth.verifyUserToken({ token });
        console.log('User ID verified via SDK:', user_id);

        const result = await whop.access.checkIfUserHasAccessToAccessPass({
          access_pass_id: process.env.WHOP_ACCESS_PASS_ID as string,
          user_id,
        });

        return res.status(200).json({ 
          hasAccess: result.has_access, 
          userId: user_id,
          message: result.has_access ? 'Access granted' : 'No active subscription'
        });
      } catch (sdkError: any) {
        console.error('SDK verification failed:', sdkError.message);
      }
    }

    // If we get here, all methods failed
    return res.status(200).json({ 
      hasAccess: false, 
      error: 'Invalid token'
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
