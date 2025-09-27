// api/check-access.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as WhopAPI from "@whop/api"; // official Whop server SDK (module namespace)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Missing user token" });
    }

    // Verify token → get user
    const { user_id } = await WhopAPI.auth.verifyUserToken({ token });

    // Check access
    const access = await WhopAPI.access.checkIfUserHasAccessToAccessPass({
      access_pass_id: process.env.WHOP_ACCESS_PASS_ID as string,
      user_id,
    });

    return res.status(200).json({ hasAccess: access.has_access, userId: user_id });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to check access" });
  }
}
