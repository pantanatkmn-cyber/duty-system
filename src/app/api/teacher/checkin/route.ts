import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  const formData = await req.formData();
  const assignmentId = parseInt(formData.get("assignmentId") as string);
  const photo = formData.get("photo") as File;
  const note = ((formData.get("note") as string) ?? "").trim() || null;

  if (!assignmentId || !photo) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  // ตรวจว่า assignment เป็นของ user นี้จริง
  const assignment = await prisma.dutyAssignment.findFirst({
    where: { id: assignmentId, userId },
    include: { dutyType: true, checkIn: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "ไม่พบข้อมูลเวร" }, { status: 404 });
  }

  if (assignment.checkIn) {
    return NextResponse.json({ error: "เช็กอินไปแล้ว" }, { status: 409 });
  }

  // บันทึกไฟล์ภาพ
  const bytes = await photo.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${userId}_${assignmentId}_${Date.now()}.jpg`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "checkin");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  const photoPath = `/uploads/checkin/${filename}`;

  // ดึง grace period จาก SystemSetting (default 5 นาที)
  const graceSetting = await prisma.systemSetting.findUnique({
    where: { key: "grace_period_minutes" },
  });
  const graceMinutes = parseInt(graceSetting?.value ?? "5", 10);

  // คำนวณสถานะ: EARLY (ก่อนเวลา), ON_TIME (ตรงเวลา), LATE (สาย)
  const now = new Date();
  const [startHour, startMin] = assignment.dutyType.startTime.split(":").map(Number);
  const dutyStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    startHour,
    startMin,
    0
  );
  const cutoff = new Date(dutyStart.getTime() + graceMinutes * 60 * 1000);

  let status: string;
  if (now < dutyStart) {
    status = "EARLY"; // เข้าเวรก่อนเวลา
  } else if (now <= cutoff) {
    status = "ON_TIME"; // ตรงเวลา (รวม grace period)
  } else {
    status = "LATE"; // สาย
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      assignmentId,
      checkInTime: now,
      photoPath,
      status,
      note,
    },
  });

  return NextResponse.json({
    success: true,
    status,
    checkInTime: checkIn.checkInTime,
  });
}
