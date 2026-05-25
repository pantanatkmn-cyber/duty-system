import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadPhoto } from "@/lib/upload";
import { bangkokDutyTime } from "@/lib/thai-time";

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

  // อัปโหลดรูปภาพ (Vercel Blob หรือ local ขึ้นกับ environment)
  let checkOutPhoto: string;
  try {
    checkOutPhoto = await uploadPhoto(photo, "checkout");
  } catch (uploadErr) {
    console.error("Upload error:", uploadErr);
    const msg = uploadErr instanceof Error ? uploadErr.message : "อัปโหลดรูปภาพไม่สำเร็จ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // คำนวณสถานะออกเวรตามประเภทเวร
  // ใช้ bangkokDutyTime เพื่อให้ถูกต้องทั้งบน Vercel (UTC) และ local (UTC+7)
  const now = new Date();
  const category = assignment.dutyType.category;
  let checkOutStatus: string;

  if (category === "PERIOD") {
    const graceSetting = await prisma.systemSetting.findUnique({ where: { key: "period_checkout_grace_minutes" } });
    const graceMinutes = parseInt(graceSetting?.value ?? "5", 10);
    const dutyEnd = bangkokDutyTime(now, assignment.dutyType.endTime);
    const earlyWindow = new Date(dutyEnd.getTime() - 5 * 60 * 1000);
    const lateWindow = new Date(dutyEnd.getTime() + graceMinutes * 60 * 1000);
    if (now < earlyWindow) {
      checkOutStatus = "EARLY_OUT";
    } else if (now <= lateWindow) {
      checkOutStatus = "ON_TIME_OUT";
    } else {
      checkOutStatus = "LATE_OUT";
    }
  } else if (category === "FRONT_GATE") {
    // 3 สถานะ: ออกก่อน readyAt = EARLY_OUT, readyAt→lateAt = ON_TIME_OUT, หลัง lateAt = LATE_OUT
    const [checkoutS, lateS] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "front_gate_checkout_time" } }),
      prisma.systemSetting.findUnique({ where: { key: "front_gate_forgot_time" } }),
    ]);
    const readyAt = bangkokDutyTime(now, checkoutS?.value ?? "16:30");
    const lateAt  = bangkokDutyTime(now, lateS?.value  ?? "18:00");
    if (now < readyAt) {
      checkOutStatus = "EARLY_OUT";
    } else if (now < lateAt) {
      checkOutStatus = "ON_TIME_OUT";
    } else {
      checkOutStatus = "LATE_OUT";
    }
  } else {
    const s = await prisma.systemSetting.findUnique({ where: { key: "point_checkout_time" } });
    const timeStr = s?.value ?? "16:30";
    const readyAt = bangkokDutyTime(now, timeStr);
    checkOutStatus = now < readyAt ? "EARLY_OUT" : "ON_TIME_OUT";
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
