import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WhopServerSdk } from '@whop/api';

// Read Whop credentials from environment variables (configure in Vercel)
const WHOP_API_KEY = process.env.WHOP_API_KEY as string;
const WHOP_APP_ID = process.env.WHOP_APP_ID as string;

// Initialize Whop SDK with env-based credentials
let whopApi: any;

try {
  whopApi = WhopServerSdk({
    appApiKey: WHOP_API_KEY,
    appId: WHOP_APP_ID,
  });
  console.log('Whop SDK initialized successfully');
} catch (sdkError: any) {
  console.error('Failed to initialize Whop SDK:', sdkError.message);
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
    // Debug environment variables
    console.log('Environment variables check:');
    console.log('WHOP_API_KEY:', WHOP_API_KEY ? 'Set' : 'Missing');
    console.log('WHOP_APP_ID:', WHOP_APP_ID ? 'Set' : 'Missing');
    console.log('Process env WHOP_API_KEY:', process.env.WHOP_API_KEY ? 'Set' : 'Missing');
    console.log('Process env WHOP_APP_ID:', process.env.WHOP_APP_ID ? 'Set' : 'Missing');
    
    // Check if required environment variables are missing
    if (!WHOP_API_KEY || !WHOP_APP_ID) {
      console.error('Missing required environment variables');
      console.error('WHOP_API_KEY exists:', !!WHOP_API_KEY);
      console.error('WHOP_APP_ID exists:', !!WHOP_APP_ID);
      throw new Error('Missing required Whop credentials in environment variables');
    }
    
    // Check if Whop SDK is properly initialized
    if (!whopApi) {
      console.error('Whop SDK is not initialized');
      throw new Error('Whop SDK initialization failed');
    }
    
    // Extract optional next parameter for post-login redirect
    const { next = '/home' } = req.query;
    
    // Determine base URL based on environment
    const baseUrl = req.headers.host?.includes('localhost') 
      ? 'http://localhost:3000'
      : `https://${req.headers.host}`;

    console.log('Initializing OAuth flow...');
    console.log('Base URL:', baseUrl);
    console.log('App ID:', WHOP_APP_ID);
    console.log('Next URL:', next);

    // Determine the correct redirect URI based on environment
    let redirectUri: string;
    
    if (baseUrl.includes('localhost')) {
      // Local development callback - use production endpoint for consistency
      redirectUri = 'https://json-to-video.vercel.app/api/oauth-callback';
    } else if (req.headers.host?.includes('json-to-video.vercel.app')) {
      // Production Vercel callback
      redirectUri = 'https://json-to-video.vercel.app/api/oauth-callback';
    } else {
      // Fallback to current host callback
      redirectUri = `${baseUrl}/api/oauth-callback`;
    }

    console.log('Using redirect URI:', redirectUri);

    // Generate authorization URL using Whop SDK (do NOT hardcode the URL)
    const { url, state } = whopApi.oauth.getAuthorizationUrl({
      redirectUri,
      scope: ['read_user'] as any, // Cast to avoid TypeScript issues
    });

    console.log('Generated OAuth URL:', url);
    console.log('OAuth State:', state);

    // Store state and next URL in a secure HttpOnly cookie
    const stateData = {
      next: next as string,
      timestamp: Date.now()
    };
    
    const encodedStateData = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const cookieValue = `oauth-state-${state}=${encodedStateData}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`;

    // Set cookie and redirect to Whop OAuth
    res.setHeader('Set-Cookie', cookieValue);
    res.redirect(url);

  } catch (error: any) {
    console.error('OAuth initialization error:', error);
    
    // Redirect to error page instead of returning JSON
    const errorUrl = `/oauth/error?error=init_failed&details=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
}