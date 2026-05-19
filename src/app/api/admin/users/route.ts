import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, fullName: true, email: true,
      phone: true, role: true, active: true, createdAt: true,
    },
    orderBy: [{ active: "desc" }, { role: "asc" }, { fullName: "asc" }],
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { username, fullName, email, phone, role, password } = body;

  if (!username?.trim() || !fullName?.trim() || !role || !password) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน (username, ชื่อ, role, รหัสผ่าน)" }, { status: 400 });
  }

  if (!["ADMIN", "CHIEF", "TEACHER"].includes(role)) {
    return NextResponse.json({ error: "role ไม่ถูกต้อง" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (exists) {
    return NextResponse.json({ error: "username นี้มีอยู่แล้ว" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      fullName: fullName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      role,
      passwordHash,
    },
    select: {
      id: true, username: true, fullName: true, email: true,
      phone: true, role: true, active: true, createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}
