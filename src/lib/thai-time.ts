// ฟังก์ชันจัดการเวลาเขตไทย (Asia/Bangkok, UTC+7)
// ใช้ Intl.DateTimeFormat เพื่อให้ถูกต้องทั้งบน Server (Vercel UTC) และ Client

const TZ = "Asia/Bangkok";

/** แปลง Date/ISO string → "HH:mm น." ในเวลาไทย (ตัวเลขอารบิค) */
export function formatThaiTime(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  // ใช้ th-TH-u-nu-latn เพื่อได้ตัวเลขอารบิค (07:30) ไม่ใช่ตัวเลขไทย (๐๗:๓๐)
  return new Intl.DateTimeFormat("th-TH-u-nu-latn", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d) + " น.";
}

/**
 * รับ Date (UTC) คืนค่า Date ใหม่ที่ปรับเป็นเที่ยงคืนเวลาไทย (UTC)
 * ใช้สำหรับสร้าง dutyStart/cutoff ในการคำนวณสถานะเวร
 */
export function bangkokMidnightOf(utcDate: Date): Date {
  // ดึงวันที่ Bangkok ของ utcDate
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utcDate); // "YYYY-MM-DD"

  const [y, m, d] = parts.split("-").map(Number);
  // Bangkok midnight = UTC midnight - 7h
  return new Date(Date.UTC(y, m - 1, d, -7, 0, 0));
}

/** สร้าง Date สำหรับเวลาเวร (HH:mm ไทย) ของวันที่กำหนด */
export function bangkokDutyTime(utcNow: Date, timeStr: string): Date {
  const [hour, min] = timeStr.split(":").map(Number);
  const midnight = bangkokMidnightOf(utcNow);
  return new Date(midnight.getTime() + (hour * 60 + min) * 60 * 1000);
}
