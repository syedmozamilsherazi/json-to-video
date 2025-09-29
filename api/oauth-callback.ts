import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from '@whop/api';

// TypeScript interfaces for API responses
interface WhopUser {
  id: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface WhopUserResponse {
  user?: WhopUser;
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface WhopMembership {
  id: string;
  status: string;
  product: string;
  user: string;
  [key: string]: any;
}

interface WhopMembershipResponse {
  data: WhopMembership[];
  [key: string]: any;
}

// Hardcoded Whop credentials - DO NOT use environment variables
const WHOP_API_KEY = 'vtecLpF8ydpmxsbl3fir5ZhjQiOYYqYnX6Xh2dWZzws';
const WHOP_APP_ID = 'app_z0Hznij7sCMJGz';
const PRODUCT_ID = 'prod_KrJw0U81FLb0Xw'; // Your access pass product ID

// Initialize Whop SDK with hardcoded credentials
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract code and state from query parameters
  const { code, state } = req.query;

  console.log('OAuth callback received:');
  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('State:', state);
  console.log('App ID:', WHOP_APP_ID);

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
    const baseUrl = req.headers.host?.includes('localhost') 
      ? 'http://localhost:3000'
      : `https://${req.headers.host}`;

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

    // Exchange the authorization code for access token using app client
    console.log('Exchanging authorization code for access token...');
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

    // Get user info using Whop REST API (v5) with the user's access token
    console.log('Fetching current user data with access token (v5)...');
    const userResponse = await fetch('https://api.whop.com/v5/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Failed to get user info (v5/me):', userResponse.status, userResponse.statusText);
      console.error('Error response body:', errorText);
      return res.redirect('/oauth/error?error=failed_to_get_user');
    }

    let userResponseData: WhopUserResponse;
    try {
      userResponseData = await userResponse.json() as WhopUserResponse;
      console.log('Raw user response:', JSON.stringify(userResponseData, null, 2));
    } catch (parseError) {
      console.error('Failed to parse user response JSON:', parseError);
      return res.redirect('/oauth/error?error=failed_to_parse_user_data');
    }
    
    // Extract user_id from response - handle different possible response structures
    let userId: string;
    let userData: WhopUser;
    
    if (userResponseData.user) {
      // Structure: { user: { id, email, ... } }
      userData = userResponseData.user;
      userId = userData.id;
    } else if (userResponseData.id) {
      // Structure: { id, email, ... }
      userData = userResponseData;
      userId = userData.id;
    } else {
      console.error('Could not find user ID in response:', userResponseData);
      return res.redirect('/oauth/error?error=no_user_id_found');
    }
    
    console.log('Successfully retrieved user ID:', userId);
    console.log('User email:', userData.email || 'N/A');
    console.log('User username:', userData.username || 'N/A');

    // Check membership status using server-side WHOP_API_KEY
    console.log('Checking membership for user:', userId, 'product:', PRODUCT_ID);
    let hasAccess: boolean = false;
    
    try {
      // Use correct query parameters: user_id and product_id with status filter
      const membershipUrl = `https://api.whop.com/v2/memberships?user_id=${userId}&product_id=${PRODUCT_ID}&status=active`;
      console.log('Membership API URL:', membershipUrl);
      
      const membershipResponse = await fetch(membershipUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (membershipResponse.ok) {
        const membershipData = await membershipResponse.json() as WhopMembershipResponse;
        console.log('Membership API response:', JSON.stringify(membershipData, null, 2));
        
        // Check if user has any active memberships for this product
        if (membershipData.data && Array.isArray(membershipData.data)) {
          hasAccess = membershipData.data.length > 0;
          console.log(`Found ${membershipData.data.length} active memberships`);
        } else {
          hasAccess = false;
          console.log('No membership data found or invalid format');
        }
        
        console.log('Final membership check result:', hasAccess);
      } else {
        const errorText = await membershipResponse.text();
        console.warn('Failed to check membership:', membershipResponse.status, membershipResponse.statusText);
        console.warn('Error response body:', errorText);
        hasAccess = false;
      }
    } catch (membershipError) {
      console.error('Error during membership check:', membershipError);
      hasAccess = false;
    }

    // Set secure HttpOnly cookies for user ID and access status (cross-device)
    const userIdCookie = `whop_user_id=${userId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`; // 30 days
    const accessCookie = `whop_has_access=${hasAccess}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`; // 30 days
    const loginStatusCookie = `whop_logged_in=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`; // 30 days

    // Determine final redirect URL
    const finalRedirectUrl = stateData.next && stateData.next !== '/' ? stateData.next : '/home';
    const redirectUrl = new URL(finalRedirectUrl, baseUrl);
    
    // Add success parameters to URL for frontend processing
    redirectUrl.searchParams.set('auth', 'success');
    redirectUrl.searchParams.set('user_id', userId);
    redirectUrl.searchParams.set('has_access', hasAccess.toString());

    console.log('Redirecting to:', redirectUrl.toString());
    console.log('Final access status:', hasAccess);

    // Set cookies and redirect (OAuth tokens kept server-side only)
    res.setHeader('Set-Cookie', [userIdCookie, accessCookie, loginStatusCookie]);
    res.redirect(redirectUrl.toString());

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const errorUrl = `/oauth/error?error=callback_failed&details=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
}