import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/stats/clear
// body: { mode: "all" } หรือ { mode: "range", start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await req.json();
  const { mode, start, end } = body as { mode: string; start?: string; end?: string };

  if (mode === "all") {
    // ลบ IncidentPhoto → IncidentReport → CheckIn ทั้งหมด (Cascade จัดการ Photo ให้อัตโนมัติ)
    const [deletedIncidents, deletedCheckIns] = await prisma.$transaction([
      prisma.incidentReport.deleteMany(),
      prisma.checkIn.deleteMany(),
    ]);

    return NextResponse.json({
      message: "ล้างสถิติทั้งหมดสำเร็จ",
      deletedCheckIns: deletedCheckIns.count,
      deletedIncidents: deletedIncidents.count,
    });
  }

  if (mode === "range" && start && end) {
    const startDate = new Date(start);
    // end inclusive: บวก 1 วัน
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);

    // หา assignment id ในช่วงวันที่
    const assignmentsInRange = await prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: startDate, lt: endDate } },
      select: { id: true },
    });
    const ids = assignmentsInRange.map((a) => a.id);

    if (ids.length === 0) {
      return NextResponse.json({ message: "ไม่มีข้อมูลในช่วงเวลาที่เลือก", deletedCheckIns: 0, deletedIncidents: 0 });
    }

    const [deletedIncidents, deletedCheckIns] = await prisma.$transaction([
      prisma.incidentReport.deleteMany({ where: { assignmentId: { in: ids } } }),
      prisma.checkIn.deleteMany({ where: { assignmentId: { in: ids } } }),
    ]);

    return NextResponse.json({
      message: `ล้างสถิติช่วง ${start} ถึง ${end} สำเร็จ`,
      deletedCheckIns: deletedCheckIns.count,
      deletedIncidents: deletedIncidents.count,
    });
  }

  return NextResponse.json({ error: "พารามิเตอร์ไม่ถูกต้อง" }, { status: 400 });
}
