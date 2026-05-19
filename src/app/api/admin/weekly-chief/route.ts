import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

// GET — ดึงหัวหน้าเวรประจำสัปดาห์ทั้งหมด
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const assignments = await prisma.weeklyChiefAssignment.findMany({
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ assignments });
}

// POST — กำหนด/เปลี่ยนหัวหน้าเวรของวันในสัปดาห์
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { dayOfWeek, userId } = body;

  if (!dayOfWeek || !userId || dayOfWeek < 1 || dayOfWeek > 5) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  // upsert — ถ้ามีอยู่แล้วให้แทนที่
  const assignment = await prisma.weeklyChiefAssignment.upsert({
    where: { dayOfWeek: parseInt(dayOfWeek) },
    update: { userId: parseInt(userId) },
    create: { dayOfWeek: parseInt(dayOfWeek), userId: parseInt(userId) },
    include: { user: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ assignment });
}

// DELETE — ลบหัวหน้าเวรของวันในสัปดาห์
export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const dayOfWeek = parseInt(searchParams.get("dayOfWeek") ?? "0");

  if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 5) {
    return NextResponse.json({ error: "ระบุวันไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.weeklyChiefAssignment.deleteMany({ where: { dayOfWeek } });
  return NextResponse.json({ success: true });
}
