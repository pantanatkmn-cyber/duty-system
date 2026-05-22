import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: { id: string } }

// PATCH /api/chief/assignments/[id]/exempt
// body: { exempted: boolean, reason?: string }
// อนุโลมหรือยกเลิกอนุโลมเวร — ทำได้โดย ADMIN, CHIEF, หรือหัวหน้าเวรประจำวัน
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  // ตรวจสิทธิ์: ADMIN / CHIEF / หรือ TEACHER ที่เป็นหัวหน้าเวรสัปดาห์นี้
  if (role !== "ADMIN" && role !== "CHIEF") {
    const now = new Date();
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const weekly = await prisma.weeklyChiefAssignment.findUnique({ where: { dayOfWeek } });
    if (weekly?.userId !== Number(session.user.id)) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }
  }

  const assignmentId = parseInt(params.id);
  if (isNaN(assignmentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { exempted, reason } = await req.json() as { exempted: boolean; reason?: string };

  const assignment = await prisma.dutyAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return NextResponse.json({ error: "ไม่พบข้อมูลเวร" }, { status: 404 });

  const updated = await prisma.dutyAssignment.update({
    where: { id: assignmentId },
    data: {
      exempted,
      exemptReason: exempted ? (reason?.trim() || null) : null,
    },
  });

  return NextResponse.json({ success: true, exempted: updated.exempted, exemptReason: updated.exemptReason });
}
