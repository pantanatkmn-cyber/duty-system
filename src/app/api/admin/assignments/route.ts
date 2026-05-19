import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "ต้องระบุวันที่" }, { status: 400 });

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  const assignments = await prisma.dutyAssignment.findMany({
    where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
    include: {
      user: { select: { id: true, fullName: true } },
      dutyType: true,
    },
    orderBy: [{ dutyType: { startTime: "asc" } }, { user: { fullName: "asc" } }],
  });

  return NextResponse.json({ assignments });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "ต้องระบุวันที่" }, { status: 400 });

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  // ลบ CheckIn/CheckOut และ Incident ที่เชื่อมกับ assignment ในวันนั้นก่อน
  const assignmentIds = (
    await prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
      select: { id: true },
    })
  ).map((a) => a.id);

  if (assignmentIds.length > 0) {
    await prisma.incidentPhoto.deleteMany({ where: { incident: { assignmentId: { in: assignmentIds } } } });
    await prisma.incidentReport.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    await prisma.checkIn.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
  }

  const result = await prisma.dutyAssignment.deleteMany({
    where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
  });

  return NextResponse.json({ deleted: result.count });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { userId, dutyTypeId, dutyDate, note } = body;

  if (!userId || !dutyTypeId || !dutyDate) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const [year, month, day] = (dutyDate as string).split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0);

  // ตรวจ unique constraint ก่อน
  const existing = await prisma.dutyAssignment.findFirst({
    where: { userId: parseInt(userId), dutyTypeId: parseInt(dutyTypeId), dutyDate: date },
  });
  if (existing) {
    return NextResponse.json({ error: "ครูคนนี้มีเวรนี้ในวันที่เลือกอยู่แล้ว" }, { status: 409 });
  }

  const assignment = await prisma.dutyAssignment.create({
    data: {
      userId: parseInt(userId),
      dutyTypeId: parseInt(dutyTypeId),
      dutyDate: date,
      note: note?.trim() || null,
    },
    include: {
      user: { select: { id: true, fullName: true } },
      dutyType: true,
    },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
