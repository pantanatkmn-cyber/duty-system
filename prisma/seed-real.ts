/**
 * seed-real.ts — ใส่ข้อมูลครูจริงและเวรคาบประจำสัปดาห์
 * รัน: npm run db:seed-real
 *
 * หมายเหตุ:
 *  - ใช้ upsert → รันซ้ำได้ ไม่สร้างซ้ำ
 *  - ผู้ใช้ที่มีอยู่แล้วจะไม่ถูกเปลี่ยนรหัสผ่าน
 *  - เวรที่มีอยู่แล้วจะไม่ถูกเขียนทับ
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ===== รายชื่อครูทั้งหมด =====
const TEACHERS = [
  // วันจันทร์
  { username: "sudjai",        fullName: "อ.สุดใจ" },
  { username: "pantanat",      fullName: "อ.ปัญธนัฐ" },
  { username: "jaroon",        fullName: "อ.จรูญ" },
  { username: "thanabat",      fullName: "อ.ธนบัตร" },
  { username: "kiattisak",     fullName: "อ.เกียรติศักดิ์" },
  { username: "uraiwan",       fullName: "อ.อุไรวรรณ" },
  { username: "thanatthap",    fullName: "อ.ธนัตถ์ทรัพย์" },
  { username: "weerapon",      fullName: "อ.วีระพล" },
  // วันอังคาร
  { username: "yaowalak",      fullName: "อ.เยาวลักษณ์" },
  { username: "kriangkrai",    fullName: "อ.เกรียงไกร" },
  { username: "suriyathep",    fullName: "อ.สุริยะเทพ" },
  { username: "khaophong",     fullName: "อ.ขาวผ่อง" },
  { username: "naree",         fullName: "อ.นารี" },
  { username: "woraphon",      fullName: "อ.วรพล" },
  { username: "latta",         fullName: "อ.ลัตตา" },
  { username: "sarawut",       fullName: "อ.ศราวุธ" },
  { username: "khetsamsak",    fullName: "อ.เขษมศักดิ์" },
  // วันพุธ
  { username: "watcharakorn",  fullName: "อ.วัชรากร" },
  { username: "koedphong",     fullName: "อ.เกิดพงศ์" },
  { username: "krittamet",     fullName: "อ.กฤตเมธ" },
  { username: "latda",         fullName: "อ.ลัตดา" },
  { username: "chutimon",      fullName: "อ.ชุติมน" },
  { username: "natthawan",     fullName: "อ.ณัฐวรรณ" },
  { username: "noppakon",      fullName: "อ.นพกร" },
  // วันพฤหัสบดี
  { username: "prayoon",       fullName: "อ.ประยูร" },
  { username: "teerayut",      fullName: "อ.ธีรยุทธ" },
  { username: "preeyaporn",    fullName: "อ.ปรียาพร" },
  { username: "suwiyathep",    fullName: "อ.สุวิยะเทพ" },
  { username: "arisa",         fullName: "อ.อาริสา" },
  { username: "kansuphak",     fullName: "อ.กรรณสุภัค" },
  // วันศุกร์
  { username: "banjong",       fullName: "อ.บรรจง" },
  { username: "phaskorn",      fullName: "อ.ภัสกร" },
  { username: "silakrittinan", fullName: "อ.ศิลากฤตินันท์" },
  { username: "naiyana",       fullName: "อ.นัยนา" },
  { username: "wasinee",       fullName: "อ.วศินี" },
  { username: "wiraphong",     fullName: "อ.วิรพงษ์" },
  { username: "wichai",        fullName: "อ.วิชัย" },
  { username: "monsit",        fullName: "อ.มนสิทธิ์" },
];

// ===== ตารางเวรคาบรายสัปดาห์ (dayIndex: 0=จันทร์ … 4=ศุกร์) =====
const WEEKLY_SCHEDULE: { username: string; dutyCode: string; dayIndex: number }[] = [
  // ======== วันจันทร์ ========
  { username: "sudjai",       dutyCode: "PERIOD_1",     dayIndex: 0 },
  { username: "pantanat",     dutyCode: "PERIOD_1",     dayIndex: 0 },
  { username: "jaroon",       dutyCode: "PERIOD_2",     dayIndex: 0 },
  { username: "thanabat",     dutyCode: "PERIOD_3",     dayIndex: 0 },
  { username: "kiattisak",    dutyCode: "PERIOD_4",     dayIndex: 0 },
  { username: "uraiwan",      dutyCode: "PERIOD_LUNCH", dayIndex: 0 },
  { username: "thanabat",     dutyCode: "PERIOD_LUNCH", dayIndex: 0 },
  { username: "thanatthap",   dutyCode: "PERIOD_5",     dayIndex: 0 },
  { username: "weerapon",     dutyCode: "PERIOD_6",     dayIndex: 0 },
  // ======== วันอังคาร ========
  { username: "yaowalak",     dutyCode: "PERIOD_1",     dayIndex: 1 },
  { username: "kriangkrai",   dutyCode: "PERIOD_1",     dayIndex: 1 },
  { username: "suriyathep",   dutyCode: "PERIOD_2",     dayIndex: 1 },
  { username: "khaophong",    dutyCode: "PERIOD_3",     dayIndex: 1 },
  { username: "naree",        dutyCode: "PERIOD_4",     dayIndex: 1 },
  { username: "woraphon",     dutyCode: "PERIOD_LUNCH", dayIndex: 1 },
  { username: "latta",        dutyCode: "PERIOD_LUNCH", dayIndex: 1 },
  { username: "sarawut",      dutyCode: "PERIOD_5",     dayIndex: 1 },
  { username: "khetsamsak",   dutyCode: "PERIOD_6",     dayIndex: 1 },
  // ======== วันพุธ ========
  { username: "watcharakorn", dutyCode: "PERIOD_1",     dayIndex: 2 },
  { username: "koedphong",    dutyCode: "PERIOD_1",     dayIndex: 2 },
  { username: "jaroon",       dutyCode: "PERIOD_2",     dayIndex: 2 },
  { username: "krittamet",    dutyCode: "PERIOD_3",     dayIndex: 2 },
  { username: "latda",        dutyCode: "PERIOD_4",     dayIndex: 2 },
  { username: "chutimon",     dutyCode: "PERIOD_LUNCH", dayIndex: 2 },
  { username: "natthawan",    dutyCode: "PERIOD_LUNCH", dayIndex: 2 },
  { username: "noppakon",     dutyCode: "PERIOD_5",     dayIndex: 2 },
  { username: "kiattisak",    dutyCode: "PERIOD_6",     dayIndex: 2 },
  // ======== วันพฤหัสบดี ========
  { username: "prayoon",      dutyCode: "PERIOD_1",     dayIndex: 3 },
  { username: "teerayut",     dutyCode: "PERIOD_1",     dayIndex: 3 },
  { username: "sudjai",       dutyCode: "PERIOD_2",     dayIndex: 3 },
  { username: "preeyaporn",   dutyCode: "PERIOD_3",     dayIndex: 3 },
  { username: "krittamet",    dutyCode: "PERIOD_4",     dayIndex: 3 },
  { username: "suwiyathep",   dutyCode: "PERIOD_LUNCH", dayIndex: 3 },
  { username: "preeyaporn",   dutyCode: "PERIOD_LUNCH", dayIndex: 3 },
  { username: "arisa",        dutyCode: "PERIOD_5",     dayIndex: 3 },
  { username: "kansuphak",    dutyCode: "PERIOD_6",     dayIndex: 3 },
  // ======== วันศุกร์ ========
  { username: "banjong",      dutyCode: "PERIOD_1",     dayIndex: 4 },
  { username: "phaskorn",     dutyCode: "PERIOD_1",     dayIndex: 4 },
  { username: "silakrittinan",dutyCode: "PERIOD_2",     dayIndex: 4 },
  { username: "weerapon",     dutyCode: "PERIOD_3",     dayIndex: 4 },
  { username: "naiyana",      dutyCode: "PERIOD_4",     dayIndex: 4 },
  { username: "wasinee",      dutyCode: "PERIOD_LUNCH", dayIndex: 4 },
  { username: "wiraphong",    dutyCode: "PERIOD_LUNCH", dayIndex: 4 },
  { username: "wichai",       dutyCode: "PERIOD_5",     dayIndex: 4 },
  { username: "monsit",       dutyCode: "PERIOD_6",     dayIndex: 4 },
];

// ===== คำนวณวันจันทร์ของสัปดาห์ปัจจุบัน =====
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function main() {
  console.log("🌱 เริ่ม seed ข้อมูลครูจริง...\n");

  const passwordHash = await bcrypt.hash("password1234", 10);
  let createdCount = 0;
  let skippedCount = 0;

  for (const t of TEACHERS) {
    const result = await prisma.user.upsert({
      where: { username: t.username },
      update: {},
      create: { username: t.username, passwordHash, fullName: t.fullName, role: "TEACHER" },
    });
    const isNew = result.createdAt.getTime() > Date.now() - 5000;
    if (isNew) { createdCount++; console.log(`  ✅ สร้าง: ${t.fullName} (${t.username})`); }
    else skippedCount++;
  }
  console.log(`\n👥 ครูใหม่ ${createdCount} คน | มีอยู่แล้ว ${skippedCount} คน`);

  const dutyTypes = await prisma.dutyType.findMany();
  const dutyTypeMap = new Map(dutyTypes.map((dt) => [dt.code, dt.id]));
  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const userMap = new Map(users.map((u) => [u.username, u.id]));

  const monday = getMondayOfCurrentWeek();
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const dayNames = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
  console.log("\n📅 มอบหมายเวรสัปดาห์นี้:");
  weekDates.forEach((d, i) => console.log(`  วัน${dayNames[i]}: ${d.toLocaleDateString("th-TH")}`));

  let assignCreated = 0;
  let assignSkipped = 0;
  const notFound: string[] = [];

  for (const s of WEEKLY_SCHEDULE) {
    const userId = userMap.get(s.username);
    const dutyTypeId = dutyTypeMap.get(s.dutyCode);
    const dutyDate = weekDates[s.dayIndex];
    if (!userId) { notFound.push(`username "${s.username}"`); continue; }
    if (!dutyTypeId) { notFound.push(`dutyCode "${s.dutyCode}"`); continue; }
    try {
      await prisma.dutyAssignment.upsert({
        where: { userId_dutyTypeId_dutyDate: { userId, dutyTypeId, dutyDate } },
        update: {},
        create: { userId, dutyTypeId, dutyDate },
      });
      assignCreated++;
    } catch { assignSkipped++; }
  }

  console.log(`\n📋 เวร: สร้าง/มีอยู่แล้ว ${assignCreated} รายการ | ข้ามไป ${assignSkipped} รายการ`);
  if (notFound.length > 0) console.log("⚠️  ไม่พบ:", [...new Set(notFound)].join(", "));
  console.log("\n🎉 Seed ข้อมูลจริงเสร็จเรียบร้อย!");
  console.log("🔑 รหัสผ่านครูทุกคน: password1234");
}

main()
  .catch((e) => { console.error("❌ Seed ล้มเหลว:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
