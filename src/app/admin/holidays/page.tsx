import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { HolidayManager } from "./holiday-manager";

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

function formatThaiDate(date: Date): string {
  return `วัน${THAI_DAYS[date.getDay()]}ที่ ${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export default async function HolidaysPage() {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">จัดการวันหยุด</h2>
        <p className="text-sm text-gray-500 mt-1">
          วันที่กำหนดเป็นวันหยุด — เวรทั้งหมดในวันนั้นเป็นโมฆะ ไม่นับในสถิติ
        </p>
      </div>
      <HolidayManager
        initialHolidays={holidays.map((h) => ({
          id: h.id,
          date: h.date.toISOString(),
          description: h.description,
          thaiDate: formatThaiDate(h.date),
        }))}
      />
    </div>
  );
}
