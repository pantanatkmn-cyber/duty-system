// helper สำหรับ upload รูปภาพ
// ลำดับการตรวจสอบ:
//   1. มี BLOB_READ_WRITE_TOKEN → ใช้ Vercel Blob (ทุก environment)
//   2. ไม่มี token + อยู่บน Vercel → แจ้ง error ชัดเจนว่าต้องตั้งค่า Blob Store
//   3. ไม่มี token + dev local → เก็บไฟล์ใน public/uploads/

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const isVercel = !!process.env.VERCEL;

  if (blobToken) {
    // === Vercel Blob ===
    const { put } = await import("@vercel/blob");
    const uniqueName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const blob = await put(uniqueName, file, { access: "public" });
    return blob.url;
  }

  if (isVercel) {
    // อยู่บน Vercel แต่ไม่มี token → ต้องเชื่อมต่อ Blob Store ก่อน
    throw new Error(
      "ยังไม่ได้ตั้งค่า Vercel Blob Store — กรุณาไปที่ Vercel Dashboard → Storage → Connect Store → Blob แล้ว Redeploy"
    );
  }

  // === Local development เท่านั้น ===
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const uploadDir = join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(join(uploadDir, filename), Buffer.from(bytes));
  return `/uploads/${folder}/${filename}`;
}
