/**
 * clear-assignments.ts — ล้างข้อมูลเวร (DutyAssignment) ทั้งหมด
 * รัน: npm run db:clear-assignments
 *
 * จะลบ: DutyAssignment + CheckIn + CheckOut + IncidentReport + IncidentPhoto
 * จะไม่ลบ: User, DutyType, SystemSetting, Holiday, ChiefAssignment
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  กำลังล้างข้อมูลเวร...\n");

  // ลบตามลำดับ (child ก่อน parent)
  const photos   = await prisma.incidentPhoto.deleteMany();
  const reports  = await prisma.incidentReport.deleteMany();
  const checkins = await prisma.checkIn.deleteMany();
  const assigns  = await prisma.dutyAssignment.deleteMany();

  console.log(`✅ ลบ IncidentPhoto    ${photos.count} รายการ`);
  console.log(`✅ ลบ IncidentReport   ${reports.count} รายการ`);
  console.log(`✅ ลบ CheckIn          ${checkins.count} รายการ`);
  console.log(`✅ ลบ DutyAssignment   ${assigns.count} รายการ`);
  console.log("\n🎉 ล้างข้อมูลเวรเสร็จแล้ว พร้อมใส่ข้อมูลใหม่");
}

main()
  .catch((e) => {
    console.error("❌ เกิดข้อผิดพลาด:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
