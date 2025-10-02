import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const bucket = (req.query.bucket as string) || (req.body && (req.body as any).bucket);
    const isPublic = ((req.query.public as string) || (req.body && (req.body as any).public) || 'true') === 'true';
    if (!bucket || typeof bucket !== 'string') {
      return res.status(400).json({ error: 'Missing bucket parameter' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ 
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on server',
        hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your deployment environment.'
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check if bucket exists
    const buckets = await admin.storage.listBuckets();
    if (!buckets || (buckets as any).error) {
      const err = (buckets as any).error;
      if (err) throw new Error(err.message || 'Failed to list buckets');
    }

    const existing = (buckets as any).data?.find((b: any) => b.name === bucket);
    if (existing) {
      return res.status(200).json({ ok: true, created: false, bucket });
    }

    const createRes = await admin.storage.createBucket(bucket, { public: isPublic });
    if ((createRes as any).error) {
      const err = (createRes as any).error;
      return res.status(500).json({ error: err.message || 'Failed to create bucket' });
    }

    return res.status(200).json({ ok: true, created: true, bucket, public: isPublic });
  } catch (e: any) {
    console.error('ensure-bucket error:', e);
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
