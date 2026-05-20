// helper อัปโหลดรูป
// - มี BLOB_READ_WRITE_TOKEN (production/Vercel) → ใช้ Vercel Blob
// - ไม่มี token (local dev) → เก็บใน public/uploads/

import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function uploadPhoto(
  file: File,
  folder: "checkin" | "checkout" | "incidents"
): Promise<string> {
  const filename = `${folder}_${Date.now()}.jpg`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // === Production: Vercel Blob ===
    const blob = await put(`${folder}/${filename}`, file, {
      access: "public",
    });
    return blob.url;
  } else {
    // === Local dev: เก็บใน public/uploads/ ===
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return `/uploads/${folder}/${filename}`;
  }
}
