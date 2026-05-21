import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/cleanup
// Vercel Cron Job เรียกทุกจันทร์ตี 2 — ล้างรูปเก่าที่มีอายุเกิน 7 วัน
export async function GET(req: NextRequest) {
  // ตรวจสอบว่าเรียกมาจาก Vercel Cron หรือ admin เท่านั้น
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7); // 7 วันที่แล้ว

  let deletedBlobCount = 0;
  let clearedCheckinPhotos = 0;
  let deletedIncidentPhotos = 0;

  try {
    // ===== 1. ล้างรูป CheckIn (เช็กอิน + ออกเวร) ที่เกิน 7 วัน =====
    const oldCheckIns = await prisma.checkIn.findMany({
      where: {
        checkInTime: { lt: cutoff },
        OR: [
          { photoPath: { not: null } },
          { checkOutPhoto: { not: null } },
        ],
      },
      select: { id: true, photoPath: true, checkOutPhoto: true },
    });

    for (const ci of oldCheckIns) {
      // ลบไฟล์จาก Vercel Blob (ถ้า URL เป็น blob URL)
      const urlsToDelete: string[] = [];
      if (ci.photoPath)    urlsToDelete.push(ci.photoPath);
      if (ci.checkOutPhoto) urlsToDelete.push(ci.checkOutPhoto);

      if (urlsToDelete.length > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { del } = await import("@vercel/blob");
          await del(urlsToDelete, { token: process.env.BLOB_READ_WRITE_TOKEN });
          deletedBlobCount += urlsToDelete.length;
        } catch {
          // ถ้าลบ blob ไม่ได้ ให้ข้ามไป (อาจถูกลบแล้ว)
        }
      }

      // ล้าง URL รูปออกจาก DB แต่คงไว้เวลาเช็กอินและสถานะ
      await prisma.checkIn.update({
        where: { id: ci.id },
        data: { photoPath: null, checkOutPhoto: null },
      });
      clearedCheckinPhotos++;
    }

    // ===== 2. ลบรูปเหตุการณ์ผิดปกติ (IncidentPhoto) ที่เกิน 7 วัน =====
    const oldIncidentPhotos = await prisma.incidentPhoto.findMany({
      where: {
        incident: { reportedAt: { lt: cutoff } },
      },
      select: { id: true, photoPath: true },
    });

    const photoPathsToDelete = oldIncidentPhotos
      .map((p) => p.photoPath)
      .filter(Boolean);

    if (photoPathsToDelete.length > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { del } = await import("@vercel/blob");
        await del(photoPathsToDelete, { token: process.env.BLOB_READ_WRITE_TOKEN });
        deletedBlobCount += photoPathsToDelete.length;
      } catch {
        // ข้ามถ้าลบ blob ไม่ได้
      }
    }

    if (oldIncidentPhotos.length > 0) {
      await prisma.incidentPhoto.deleteMany({
        where: { id: { in: oldIncidentPhotos.map((p) => p.id) } },
      });
      deletedIncidentPhotos = oldIncidentPhotos.length;
    }

    const summary = {
      cutoffDate: cutoff.toISOString(),
      clearedCheckinPhotos,
      deletedIncidentPhotos,
      deletedBlobFiles: deletedBlobCount,
    };

    console.log("🧹 Cleanup เสร็จ:", summary);
    return NextResponse.json({ success: true, ...summary });

  } catch (err) {
    console.error("❌ Cleanup error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
