import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(session.user.id);
  const formData = await req.formData();
  const assignmentId = parseInt(formData.get("assignmentId") as string);
  const photo = formData.get("photo") as File;

  if (!assignmentId || !photo) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  // ตรวจว่า assignment เป็นของ user นี้และมี checkIn แล้ว
  const assignment = await prisma.dutyAssignment.findFirst({
    where: { id: assignmentId, userId },
    include: { dutyType: true, checkIn: true },
  });

  if (!assignment) return NextResponse.json({ error: "ไม่พบข้อมูลเวร" }, { status: 404 });
  if (!assignment.checkIn) return NextResponse.json({ error: "ยังไม่ได้เช็กอินเข้าเวร" }, { status: 400 });
  if (assignment.checkIn.checkOutTime) return NextResponse.json({ error: "ออกเวรไปแล้ว" }, { status: 409 });

  // บันทึกไฟล์ภาพ
  const bytes = await photo.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `checkout_${userId}_${assignmentId}_${Date.now()}.jpg`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "checkout");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  const checkOutPhoto = `/uploads/checkout/${filename}`;

  // คำนวณสถานะออกเวร
  const now = new Date();
  const [endHour, endMin] = assignment.dutyType.endTime.split(":").map(Number);
  const dutyEnd = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(),
    endHour, endMin, 0
  );
  // ออกก่อนได้ 5 นาที
  const earlyWindow = new Date(dutyEnd.getTime() - 5 * 60 * 1000);

  let checkOutStatus: string;
  if (now < earlyWindow) {
    checkOutStatus = "EARLY_OUT";   // ออกเวรก่อนกำหนด
  } else if (now <= dutyEnd) {
    checkOutStatus = "ON_TIME_OUT"; // ออกเวรตรงเวลา
  } else {
    checkOutStatus = "LATE_OUT";    // ออกเวรช้า
  }

  // อัปเดต CheckIn record
  const updated = await prisma.checkIn.update({
    where: { id: assignment.checkIn.id },
    data: {
      checkOutTime: now,
      checkOutPhoto,
      checkOutStatus,
    },
  });

  return NextResponse.json({
    success: true,
    checkOutStatus,
    checkOutTime: updated.checkOutTime,
  });
}
