import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  // คำนวณช่วงวันนี้ (เวลาท้องถิ่นของ server)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const assignments = await prisma.dutyAssignment.findMany({
    where: {
      userId,
      dutyDate: { gte: todayStart, lt: tomorrowStart },
    },
    include: {
      dutyType: true,
      checkIn: true,
    },
    orderBy: [{ dutyType: { startTime: "asc" } }],
  });

  return NextResponse.json(assignments);
}
