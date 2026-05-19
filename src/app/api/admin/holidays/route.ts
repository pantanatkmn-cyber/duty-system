import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const holidays = await prisma.holiday.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ holidays });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { date, description } = body;

  if (!date || !description?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุวันที่และชื่อวันหยุด" }, { status: 400 });
  }

  const [year, month, day] = (date as string).split("-").map(Number);
  const holidayDate = new Date(year, month - 1, day, 0, 0, 0);

  try {
    const holiday = await prisma.holiday.create({
      data: { date: holidayDate, description: description.trim() },
    });
    return NextResponse.json({ holiday }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "วันนี้มีวันหยุดอยู่แล้ว" }, { status: 409 });
  }
}
