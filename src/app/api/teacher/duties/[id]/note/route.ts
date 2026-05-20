import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignmentId = parseInt(params.id);
  if (isNaN(assignmentId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const { teacherNote } = await req.json();

  // ตรวจสอบว่าเวรนี้เป็นของครูคนนี้จริง
  const assignment = await prisma.dutyAssignment.findFirst({
    where: { id: assignmentId, userId: parseInt(session.user.id) },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await prisma.dutyAssignment.update({
      where: { id: assignmentId },
      data: { teacherNote: teacherNote?.trim() || null },
    });
    return NextResponse.json({ teacherNote: updated.teacherNote });
  } catch (err) {
    console.error("teacherNote update error:", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
