// แปลง Vercel Blob URL → proxy URL สำหรับแสดงรูปแบบ private
// local dev URL (/uploads/...) ใช้ตรงได้เลย ไม่ต้องผ่าน proxy
export function blobPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes(".blob.vercel-storage.com")) {
    return `/api/photo?url=${encodeURIComponent(url)}`;
  }
  return url;
}
