import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadPhoto } from "@/lib/upload";

const MAX_INCIDENTS = 5;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const formData = await req.formData();

  const assignmentId = parseInt(formData.get("assignmentId") as string);
  const incidentType = (formData.get("incidentType") as string)?.trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const photo = formData.get("photo") as File | null;

  if (!assignmentId || !incidentType) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  // ตรวจว่า assignment เป็นของ user นี้
  const assignment = await prisma.dutyAssignment.findFirst({
    where: { id: assignmentId, userId },
    include: { _count: { select: { incidents: true } } },
  });

  if (!assignment) {
    return NextResponse.json({ error: "ไม่พบข้อมูลเวร" }, { status: 404 });
  }

  // ตรวจจำนวน incident ไม่เกิน 5 ต่อเวร
  if (assignment._count.incidents >= MAX_INCIDENTS) {
    return NextResponse.json(
      { error: `รายงานเหตุการณ์ได้สูงสุด ${MAX_INCIDENTS} รายการต่อเวร` },
      { status: 409 }
    );
  }

  // อัปโหลดรูปภาพถ้ามี (Vercel Blob หรือ local ขึ้นกับ environment)
  let photoPath: string | null = null;
  if (photo && photo.size > 0) {
    try {
      photoPath = await uploadPhoto(photo, "incidents");
    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      return NextResponse.json(
        { error: "อัปโหลดรูปภาพไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า BLOB_READ_WRITE_TOKEN" },
        { status: 500 }
      );
    }
  }

  // สร้าง IncidentReport พร้อม photo ถ้ามี
  const incident = await prisma.incidentReport.create({
    data: {
      assignmentId,
      incidentType,
      description,
      ...(photoPath
        ? { photos: { create: { photoPath } } }
        : {}),
    },
    include: { photos: true },
  });

  return NextResponse.json({ success: true, incident });
}
