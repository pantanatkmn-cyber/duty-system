// ฟังก์ชันจัดการเวลาเขตไทย (UTC+7)
// ใช้การบวก offset ตรงๆ เพื่อให้ทำงานถูกต้องทั้งบน Vercel (UTC) และเครื่องท้องถิ่น

/** แปลง Date/ISO string → "HH:mm น." ในเวลาไทย (UTC+7) */
export function formatThaiTime(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  // บวก 7 ชั่วโมงตรงๆ แล้วอ่าน UTC — ไม่พึ่ง ICU timezone database
  const bkk = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const hh = String(bkk.getUTCHours()).padStart(2, "0");
  const mm = String(bkk.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} น.`;
}

/**
 * รับ Date (UTC) คืนค่า Date ใหม่ที่ปรับเป็นเที่ยงคืนเวลาไทย (UTC)
 * ใช้สำหรับสร้าง dutyStart/cutoff ในการคำนวณสถานะเวร
 */
export function bangkokMidnightOf(utcDate: Date): Date {
  // บวก 7h เพื่อได้วันที่ Bangkok แล้วตัดเวลาออก
  const bkk = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
  const y = bkk.getUTCFullYear();
  const m = bkk.getUTCMonth();
  const d = bkk.getUTCDate();
  // Bangkok midnight ในหน่วย UTC = UTC 17:00 ของวันก่อน
  return new Date(Date.UTC(y, m, d, -7, 0, 0));
}

/** สร้าง Date สำหรับเวลาเวร (HH:mm ไทย) ของวันที่กำหนด */
export function bangkokDutyTime(utcNow: Date, timeStr: string): Date {
  const [hour, min] = timeStr.split(":").map(Number);
  const midnight = bangkokMidnightOf(utcNow);
  return new Date(midnight.getTime() + (hour * 60 + min) * 60 * 1000);
}
