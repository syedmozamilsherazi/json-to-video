// api/check-access.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { auth, access } from "@whop/api"; // official Whop server SDK (named imports)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Missing user token" });
    }

    // Verify token → get user
    const { user_id } = await auth.verifyUserToken({ token });

    // Check access
    const result = await access.checkIfUserHasAccessToAccessPass({
      access_pass_id: process.env.WHOP_ACCESS_PASS_ID as string,
      user_id,
    });

    return res.status(200).json({ hasAccess: result.has_access, userId: user_id });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Failed to check access" });
  }
}
