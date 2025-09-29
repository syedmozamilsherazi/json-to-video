// api/check-access.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Whop from "@whop/api"; // Use default import instead

// Initialize Whop client with API key
const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY as string,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");

    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ error: "Missing or invalid user token" });
    }

    console.log('Verifying token:', token.substring(0, 10) + '...');

    // Verify token → get user
    const { user_id } = await whop.auth.verifyUserToken({ token });
    
    console.log('User ID verified:', user_id);

    // Check access
    const result = await whop.access.checkIfUserHasAccessToAccessPass({
      access_pass_id: process.env.WHOP_ACCESS_PASS_ID as string,
      user_id,
    });
    
    console.log('Access check result:', result);

    return res.status(200).json({ 
      hasAccess: result.has_access, 
      userId: user_id,
      message: result.has_access ? 'Access granted' : 'No active subscription'
    });
  } catch (err: any) {
    console.error('API error:', err);
    
    // Return more specific error information
    if (err.message?.includes('token') || err.message?.includes('unauthorized')) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    return res.status(500).json({ 
      error: "Failed to check access",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
