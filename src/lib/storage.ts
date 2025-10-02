export async function ensureBucket(bucketName: string, isPublic = true): Promise<boolean> {
  try {
    const params = new URLSearchParams({ bucket: bucketName, public: String(isPublic) });
    const res = await fetch(`/api/storage/ensure-bucket?${params.toString()}`, { method: 'POST' });
    return res.ok;
  } catch (e) {
    console.warn('[ensureBucket] Failed to ensure bucket', bucketName, e);
    return false;
  }
}
