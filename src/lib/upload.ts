// helper สำหรับ upload รูป
// - Production (มี BLOB_READ_WRITE_TOKEN): ใช้ Vercel Blob
// - Development (ไม่มี token): ใช้ local filesystem ใน public/uploads/

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  // ตรวจว่ารันบน Vercel หรือเปล่า (Vercel ตั้ง env นี้อัตโนมัติ)
  const isVercel = !!process.env.VERCEL;

  if (isVercel) {
    // === Vercel Blob (production/preview) ===
    // token อ่านอัตโนมัติจาก OIDC หรือ BLOB_READ_WRITE_TOKEN
    const { put } = await import("@vercel/blob");
    const uniqueName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const blob = await put(uniqueName, file, { access: "public" });
    return blob.url;
  } else {
    // === Local filesystem (development เท่านั้น) ===
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const uploadDir = join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(join(uploadDir, filename), Buffer.from(bytes));
    return `/uploads/${folder}/${filename}`;
  }
}
