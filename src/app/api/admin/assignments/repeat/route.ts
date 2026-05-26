import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

// บอก Vercel ให้รอได้สูงสุด 60 วินาที
export const maxDuration = 60;

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

  // สร้าง Set ของ "userId-dutyTypeId" ของวันต้นแบบ เพื่อเปรียบเทียบเร็ว
  const sourceSet = new Set(
    sourceAssignments.map((a) => `${a.userId}-${a.dutyTypeId}`)
  );

  let totalCreated = 0;
  let totalDeleted = 0;
  let totalSkipped = 0;

  // วนทีละสัปดาห์
  for (let w = 1; w <= weeks; w++) {
    const targetDate = new Date(sourceDate);
    targetDate.setDate(sourceDate.getDate() + w * 7);
    const targetNextDay = new Date(targetDate);
    targetNextDay.setDate(targetDate.getDate() + 1);

    // ดึง assignment ที่มีอยู่แล้วในสัปดาห์นั้น (รวม CheckIn เพื่อเช็กว่าเช็กอินแล้วหรือยัง)
    const existing = await prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: targetDate, lt: targetNextDay } },
      select: { id: true, userId: true, dutyTypeId: true, checkIn: { select: { id: true } } },
    });

    // ---- ลบรายชื่อที่ไม่อยู่ในวันต้นแบบ (เฉพาะที่ยังไม่ได้เช็กอิน) ----
    const toDelete = existing.filter(
      (a) => !sourceSet.has(`${a.userId}-${a.dutyTypeId}`) && !a.checkIn
    );
    const skipped = existing.filter(
      (a) => !sourceSet.has(`${a.userId}-${a.dutyTypeId}`) && !!a.checkIn
    );

    if (toDelete.length > 0) {
      await prisma.dutyAssignment.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } },
      });
      totalDeleted += toDelete.length;
    }
    totalSkipped += skipped.length;

    // ---- เพิ่มรายชื่อที่อยู่ในวันต้นแบบแต่ยังไม่มีในสัปดาห์นั้น ----
    const existingSet = new Set(existing.map((a) => `${a.userId}-${a.dutyTypeId}`));
    const toCreate = sourceAssignments.filter(
      (a) => !existingSet.has(`${a.userId}-${a.dutyTypeId}`)
    );

    if (toCreate.length > 0) {
      const result = await prisma.dutyAssignment.createMany({
        data: toCreate.map((a) => ({
          userId: a.userId,
          dutyTypeId: a.dutyTypeId,
          dutyDate: targetDate,
        })),
        skipDuplicates: true,
      });
      totalCreated += result.count;
    }
  }

  return NextResponse.json({
    success: true,
    created: totalCreated,
    deleted: totalDeleted,
    skipped: totalSkipped, // เวรที่เช็กอินแล้ว — ไม่ลบ
    weeks,
  });
}
