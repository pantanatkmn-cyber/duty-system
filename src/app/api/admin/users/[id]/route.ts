import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { fullName, email, phone, role, active, password } = body;

  // ป้องกัน admin ปิดใช้งานบัญชีตัวเอง
  if (id === parseInt(session!.user.id) && active === false) {
    return NextResponse.json({ error: "ไม่สามารถปิดใช้งานบัญชีตัวเองได้" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (fullName !== undefined) updateData.fullName = fullName.trim();
  if (email !== undefined) updateData.email = email?.trim() || null;
  if (phone !== undefined) updateData.phone = phone?.trim() || null;
  if (role !== undefined) {
    if (!["ADMIN", "CHIEF", "TEACHER"].includes(role)) {
      return NextResponse.json({ error: "role ไม่ถูกต้อง" }, { status: 400 });
    }
    updateData.role = role;
  }
  if (active !== undefined) updateData.active = active;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, username: true, fullName: true, email: true,
      phone: true, role: true, active: true, createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
