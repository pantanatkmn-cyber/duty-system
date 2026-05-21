import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/assignments/clear-all
// ลบ DutyAssignment ทั้งหมดในระบบ พร้อม CheckIn, Incident, IncidentPhoto ที่เชื่อมอยู่
export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return error;

  // นับจำนวนก่อนลบ
  const total = await prisma.dutyAssignment.count();

  // ลบตามลำดับ relation (ลบลูกก่อนแม่)
  await prisma.incidentPhoto.deleteMany({});
  await prisma.incidentReport.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.dutyAssignment.deleteMany({});

  return NextResponse.json({ deleted: total });
}
