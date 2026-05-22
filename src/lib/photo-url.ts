import { head } from "@vercel/blob";

// ใช้ใน Server Component: แปลง private blob URL → signed downloadUrl โดยตรง
// ไม่ต้องผ่าน proxy เพราะ server มีสิทธิ์เรียก Vercel Blob โดยตรง
export async function resolvePhotoUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.includes(".blob.vercel-storage.com")) {
    try {
      const { downloadUrl } = await head(url);
      return downloadUrl;
    } catch {
      return null;
    }
  }
  return url; // local dev path (/uploads/...) ใช้ตรงได้เลย
}

// ใช้ใน Client Component (legacy — ไม่แนะนำสำหรับของใหม่)
export function blobPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/photo?url=${encodeURIComponent(url)}`;
  }
  return url;
}
