import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/duty-types/bulk
// body: { types: Array<{ id: number, startTime: string, endTime: string }> }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const { types } = await req.json() as {
    types: Array<{ id: number; startTime: string; endTime: string }>;
  };

  if (!Array.isArray(types)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // ตรวจรูปแบบเวลา HH:mm
  const timeRegex = /^\d{2}:\d{2}$/;
  for (const t of types) {
    if (!timeRegex.test(t.startTime) || !timeRegex.test(t.endTime)) {
      return NextResponse.json({ error: `รูปแบบเวลาไม่ถูกต้อง (id: ${t.id})` }, { status: 400 });
    }
  }

  await prisma.$transaction(
    types.map(({ id, startTime, endTime }) =>
      prisma.dutyType.update({ where: { id }, data: { startTime, endTime } })
    )
  );

  return NextResponse.json({ success: true, updated: types.length });
}
