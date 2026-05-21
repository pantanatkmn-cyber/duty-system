// helper สำหรับ upload รูป
// - Production (มี BLOB_READ_WRITE_TOKEN): ใช้ Vercel Blob
// - Development (ไม่มี token): ใช้ local filesystem ใน public/uploads/

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    // === Vercel Blob (production) ===
    // ให้ library อ่าน token จาก env อัตโนมัติ ไม่ส่งผ่าน parameter
    const { put } = await import("@vercel/blob");
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const blob = await put(`${folder}/${uniqueName}`, file, { access: "public" });
    return blob.url;
  } else {
    // === Local filesystem (development) ===
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
