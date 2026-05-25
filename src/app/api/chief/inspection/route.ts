import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ===================================================================
// GET /api/chief/inspection?date=YYYY-MM-DD
// คืนค่าผลตรวจจุดของวันนั้น (หรือ null ถ้ายังไม่ได้ตรวจ)
// ===================================================================
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "ต้องระบุวันที่" }, { status: 400 });

  const inspection = await prisma.chiefInspection.findUnique({
    where: { inspectedDate: date },
    include: {
      results: true,
      submittedBy: { select: { fullName: true } },
    },
  });

  return NextResponse.json({ inspection });
}

// ===================================================================
// POST /api/chief/inspection
// body: { date, results: [{pointCode, pointName, status, note}], overallNote? }
// บันทึก/อัปเดตผลตรวจ — status: "CLEAN" | "DIRTY"
// ===================================================================
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ตรวจสิทธิ์: ADMIN/CHIEF เข้าได้เลย
  // TEACHER ต้องเป็นหัวหน้าเวรของวันนั้น
  if (session.user.role !== "ADMIN" && session.user.role !== "CHIEF") {
    const now = new Date();
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const myChief = await prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek },
    });
    if (myChief?.userId !== Number(session.user.id)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { date, results, overallNote } = body as {
    date: string;
    results: Array<{ pointCode: string; pointName: string; status: string; note?: string }>;
    overallNote?: string;
  };

  if (!date || !Array.isArray(results)) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const now = new Date();
  const userId = Number(session.user.id);

  // upsert ChiefInspection (1 record ต่อวัน)
  const inspection = await prisma.chiefInspection.upsert({
    where: { inspectedDate: date },
    update: {
      submittedAt: now,
      overallNote: overallNote ?? null,
      submittedById: userId,
    },
    create: {
      inspectedDate: date,
      submittedAt: now,
      overallNote: overallNote ?? null,
      submittedById: userId,
    },
  });

  // upsert ผลแต่ละจุด (เฉพาะที่มี status)
  for (const r of results) {
    if (!r.status) continue;
    await prisma.inspectionPointResult.upsert({
      where: {
        inspectionId_pointCode: {
          inspectionId: inspection.id,
          pointCode: r.pointCode,
        },
      },
      update: {
        status: r.status,
        note: r.note ?? null,
        pointName: r.pointName, // อัปเดตชื่อจุดด้วยเพื่อกันเหตุการณ์ชื่อเปลี่ยน
      },
      create: {
        inspectionId: inspection.id,
        pointCode: r.pointCode,
        pointName: r.pointName,
        status: r.status,
        note: r.note ?? null,
      },
    });
  }

  return NextResponse.json({
    success: true,
    submittedAt: now.toISOString(),
  });
}
