// แปลง Vercel Blob URL (private) → proxy URL ผ่าน /api/photo
// ใช้ได้ทั้ง Server Component และ Client Component
// local dev URL (/uploads/...) ใช้ตรงได้เลย
export function blobPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/photo?url=${encodeURIComponent(url)}`;
  }
  return url;
}
