import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 เริ่ม seed ข้อมูลเริ่มต้น...");

  // --------------------------------------------------------------
  // 1) System settings - ค่าผ่อนผันการเข้าเวร (admin แก้ไขได้)
  // --------------------------------------------------------------
  await prisma.systemSetting.upsert({
    where: { key: "grace_period_minutes" },
    update: {},
    create: {
      key: "grace_period_minutes",
      value: "5", // ค่าเริ่มต้น 5 นาที
    },
  });

  // grace period สำหรับออกเวรช้า (เวรคาบ) — admin ปรับได้
  await prisma.systemSetting.upsert({
    where: { key: "period_checkout_grace_minutes" },
    update: {},
    create: {
      key: "period_checkout_grace_minutes",
      value: "5", // ออกเวรช้าได้ไม่เกิน 5 นาที ถือว่า ON_TIME_OUT
    },
  });
  console.log("✅ ตั้งค่าผ่อนผัน 5 นาที");

  // --------------------------------------------------------------
  // 2) Duty types - ประเภทเวรทั้งหมดตาม spec
  // --------------------------------------------------------------
  const dutyTypes = [
    // เวรประตูหน้า
    {
      code: "FRONT_GATE",
      name: "เวรประตูหน้า",
      category: "FRONT_GATE",
      startTime: "07:30",
      endTime: "08:20",
      description: "ยืนต้อนรับนักศึกษาที่ประตูหน้า",
    },
    // เวรประจำจุด 4 จุด
    {
      code: "POINT_SIDE_GATE",
      name: "ประจำจุด: ประตูข้าง",
      category: "POINT",
      startTime: "11:50",
      endTime: "12:40",
      description: "ตรวจเช็กความเรียบร้อยที่ประตูข้าง",
    },
    {
      code: "POINT_CANTEEN_BLD9",
      name: "ประจำจุด: โรงอาหาร+ห้องน้ำหญิง+อาคาร 9 ปี",
      category: "POINT",
      startTime: "12:40",
      endTime: "17:00",
      description: "ส่งรายงานภายใน 17.00 น.",
    },
    {
      code: "POINT_MEN_BLD19",
      name: "ประจำจุด: ห้องน้ำชาย+อาคาร 19 ปี",
      category: "POINT",
      startTime: "12:40",
      endTime: "17:00",
      description: "ส่งรายงานภายใน 17.00 น.",
    },
    {
      code: "POINT_BLD29",
      name: "ประจำจุด: อาคาร 29 ปี",
      category: "POINT",
      startTime: "12:40",
      endTime: "17:00",
      description: "ส่งรายงานภายใน 17.00 น.",
    },
    // เวรคาบ
    {
      code: "PERIOD_1",
      name: "เวรคาบที่ 1",
      category: "PERIOD",
      startTime: "08:20",
      endTime: "09:20",
      description: "เฝ้าประตูหน้าระหว่างคาบเรียน",
    },
    {
      code: "PERIOD_2",
      name: "เวรคาบที่ 2",
      category: "PERIOD",
      startTime: "09:20",
      endTime: "10:10",
      description: "เฝ้าประตูหน้าระหว่างคาบเรียน",
    },
    {
      code: "PERIOD_3",
      name: "เวรคาบที่ 3",
      category: "PERIOD",
      startTime: "10:10",
      endTime: "11:00",
      description: "เฝ้าประตูหน้าระหว่างคาบเรียน",
    },
    {
      code: "PERIOD_4",
      name: "เวรคาบที่ 4",
      category: "PERIOD",
      startTime: "11:00",
      endTime: "11:50",
      description: "เฝ้าประตูหน้าระหว่างคาบเรียน",
    },
    {
      code: "PERIOD_LUNCH",
      name: "เวรคาบพักเที่ยง",
      category: "PERIOD",
      startTime: "11:50",
      endTime: "12:40",
      description: "เฝ้าประตูหน้าช่วงพักเที่ยง",
    },
    {
      code: "PERIOD_5",
      name: "เวรคาบที่ 5",
      category: "PERIOD",
      startTime: "12:40",
      endTime: "13:30",
      description: "เฝ้าประตูหน้าระหว่างคาบเรียน",
    },
    {
      code: "PERIOD_6",
      name: "เวรคาบที่ 6",
      category: "PERIOD",
      startTime: "13:30",
      endTime: "14:20",
      description: "เฝ้าประตูหน้าระหว่างคาบเรียน",
    },
  ];

  for (const dt of dutyTypes) {
    await prisma.dutyType.upsert({
      where: { code: dt.code },
      update: dt,
      create: dt,
    });
  }
  console.log(`✅ สร้างประเภทเวร ${dutyTypes.length} ประเภท`);

  // --------------------------------------------------------------
  // 3) Users ตัวอย่าง (admin + chief + teachers)
  // --------------------------------------------------------------
  const defaultPassword = await bcrypt.hash("password123", 10);

  // Admin (รหัสผ่าน: admin123)
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
      fullName: "ผู้ดูแลระบบ",
      email: "admin@santapol.ac.th",
      role: "ADMIN",
    },
  });
  console.log("✅ สร้าง admin (username: admin / password: admin123)");

  // ครูตัวอย่าง 5 คน (รหัสผ่าน: password123)
  const teachers = [
    { username: "teacher1", fullName: "อ.สมชาย ใจดี" },
    { username: "teacher2", fullName: "อ.สมหญิง รักเรียน" },
    { username: "teacher3", fullName: "อ.มานี มีนา" },
    { username: "teacher4", fullName: "อ.วิชัย วงศ์ใหญ่" },
    { username: "teacher5", fullName: "อ.ปิยะ พรหมจรรย์" },
  ];

  for (const t of teachers) {
    await prisma.user.upsert({
      where: { username: t.username },
      update: {},
      create: {
        username: t.username,
        passwordHash: defaultPassword,
        fullName: t.fullName,
        role: "TEACHER",
      },
    });
  }
  console.log(`✅ สร้างครู ${teachers.length} คน (password: password123)`);

  // --------------------------------------------------------------
  // 4) DutyAssignment ตัวอย่าง — มอบเวรให้ teacher1 วันนี้ (เพื่อทดสอบ Phase 2)
  // --------------------------------------------------------------
  const teacher1 = await prisma.user.findUnique({ where: { username: "teacher1" } });
  const frontGate = await prisma.dutyType.findUnique({ where: { code: "FRONT_GATE" } });
  const period1 = await prisma.dutyType.findUnique({ where: { code: "PERIOD_1" } });
  const pointSide = await prisma.dutyType.findUnique({ where: { code: "POINT_SIDE_GATE" } });

  if (teacher1 && frontGate && period1 && pointSide) {
    // วันนี้เวลา 00:00 (local)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const testAssignments = [
      { userId: teacher1.id, dutyTypeId: frontGate.id, dutyDate: today },
      { userId: teacher1.id, dutyTypeId: period1.id, dutyDate: today },
      { userId: teacher1.id, dutyTypeId: pointSide.id, dutyDate: today },
    ];

    for (const a of testAssignments) {
      await prisma.dutyAssignment.upsert({
        where: { userId_dutyTypeId_dutyDate: a },
        update: {},
        create: a,
      });
    }
    console.log("✅ สร้าง DutyAssignment ทดสอบ 3 รายการให้ teacher1 (วันนี้)");
  }

  console.log("🎉 Seed เสร็จเรียบร้อย!");
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
