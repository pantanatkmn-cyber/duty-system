import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { date, weeks = 18 } = body as { date: string; weeks: number };

  if (!date) {
    return NextResponse.json({ error: "ต้องระบุวันที่" }, { status: 400 });
  }

  const [year, month, day] = date.split("-").map(Number);
  const sourceDate = new Date(year, month - 1, day, 0, 0, 0);
  const sourceNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  // ดึง assignment ของวันต้นแบบ
  const sourceAssignments = await prisma.dutyAssignment.findMany({
    where: { dutyDate: { gte: sourceDate, lt: sourceNextDay } },
    select: { userId: true, dutyTypeId: true },
  });

  if (sourceAssignments.length === 0) {
    return NextResponse.json({ error: "ไม่มีเวรในวันที่เลือก" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;

  // สร้างเวรใน N สัปดาห์ถัดไป (เพิ่มทีละ 7 วัน)
  for (let w = 1; w <= weeks; w++) {
    const targetDate = new Date(sourceDate);
    targetDate.setDate(sourceDate.getDate() + w * 7);

    for (const a of sourceAssignments) {
      try {
        await prisma.dutyAssignment.upsert({
          where: {
            userId_dutyTypeId_dutyDate: {
              userId: a.userId,
              dutyTypeId: a.dutyTypeId,
              dutyDate: targetDate,
            },
          },
          update: {}, // ถ้ามีอยู่แล้วไม่เปลี่ยน
          create: {
            userId: a.userId,
            dutyTypeId: a.dutyTypeId,
            dutyDate: targetDate,
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({ success: true, created, skipped, weeks });
}
