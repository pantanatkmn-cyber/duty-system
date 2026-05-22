import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zipSync } from "fflate";

// GET /api/chief/download-photos?date=YYYY-MM-DD
// ดาวน์โหลดรูปทั้งหมดของเวรวันนั้นเป็น ZIP
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // อนุญาต ADMIN / CHIEF / หรือ TEACHER ที่เป็นหัวหน้าเวรสัปดาห์นี้
  const dateStr = req.nextUrl.searchParams.get("date");
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new NextResponse("Invalid date", { status: 400 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "CHIEF") {
    const d = new Date(dateStr);
    const jsDay = d.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const weekly = await prisma.weeklyChiefAssignment.findUnique({ where: { dayOfWeek } });
    if (weekly?.userId !== Number(session.user.id)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  // ดึงข้อมูลทั้งหมด
  const assignments = await prisma.dutyAssignment.findMany({
    where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
    include: {
      user: { select: { fullName: true } },
      dutyType: { select: { name: true } },
      checkIn: { select: { photoPath: true, checkOutPhoto: true } },
      incidents: { include: { photos: { select: { photoPath: true } } } },
    },
  });

  // รวม URL รูปทั้งหมด พร้อมชื่อไฟล์ใน ZIP
  type PhotoEntry = { path: string; url: string };
  const entries: PhotoEntry[] = [];

  for (const a of assignments) {
    const name = sanitize(a.user.fullName);
    const duty = sanitize(a.dutyType.name);

    if (a.checkIn?.photoPath) {
      entries.push({ path: `เช็กอิน/${name}_${duty}.jpg`, url: a.checkIn.photoPath });
    }
    if (a.checkIn?.checkOutPhoto) {
      entries.push({ path: `ออกเวร/${name}_${duty}.jpg`, url: a.checkIn.checkOutPhoto });
    }
    a.incidents.forEach((inc, ii) => {
      inc.photos.forEach((p, pi) => {
        const type = sanitize(inc.incidentType);
        entries.push({ path: `เหตุการณ์/${name}_${type}_${ii + 1}_${pi + 1}.jpg`, url: p.photoPath });
      });
    });
  }

  if (entries.length === 0) {
    return new NextResponse("ไม่มีรูปภาพในวันที่เลือก", { status: 404 });
  }

  // ดาวน์โหลดรูปทั้งหมดพร้อมกัน
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const fetched = await Promise.allSettled(
    entries.map(async (e) => {
      const res = await fetch(e.url, {
        headers: blobToken && e.url.includes(".blob.vercel-storage.com")
          ? { authorization: `Bearer ${blobToken}` }
          : {},
      });
      if (!res.ok) throw new Error(`fetch failed: ${e.url}`);
      const buf = await res.arrayBuffer();
      return { path: e.path, data: new Uint8Array(buf) };
    })
  );

  // รวมเฉพาะที่สำเร็จ
  const files: Record<string, Uint8Array> = {};
  let success = 0;
  for (const r of fetched) {
    if (r.status === "fulfilled") {
      files[r.value.path] = r.value.data;
      success++;
    }
  }

  if (success === 0) {
    return new NextResponse("ไม่สามารถดาวน์โหลดรูปได้", { status: 500 });
  }

  // สร้าง ZIP
  const zipped = zipSync(files, { level: 0 }); // level 0 = store only (รูปไม่ต้องบีบอัดซ้ำ)

  return new NextResponse(zipped, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`รูปเวร-${dateStr}.zip`)}`,
    },
  });
}

// ตัดอักขระที่ไม่ปลอดภัยในชื่อไฟล์
function sanitize(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "ไม่มีชื่อ";
}
