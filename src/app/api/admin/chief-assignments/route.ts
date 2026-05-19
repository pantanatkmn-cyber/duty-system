import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { userId, dutyDate } = body;

  if (!userId || !dutyDate) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const [year, month, day] = (dutyDate as string).split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0);

  // upsert: ถ้ามีแล้วให้แทนที่ (1 วัน มีได้ 1 หัวหน้า)
  // ลบเดิมก่อน แล้วสร้างใหม่
  await prisma.chiefAssignment.deleteMany({
    where: { dutyDate: { gte: date, lt: new Date(year, month - 1, day + 1, 0, 0, 0) } },
  });

  const chief = await prisma.chiefAssignment.create({
    data: { userId: parseInt(userId), dutyDate: date },
    include: { user: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ chief }, { status: 201 });
}
