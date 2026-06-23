"use client";

import { useState } from "react";
import Link from "next/link";

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function formatThaiDateFull(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `วัน${THAI_DAYS[dow]}ที่ ${d} ${THAI_MONTHS[m - 1]} พ.ศ. ${y + 543}`;
}

export default function AdminReportsPage() {
  const today = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(today);

  const chiefUrl  = `/chief?date=${selectedDate}`;
  const printUrl  = `/chief/print?date=${selectedDate}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้าผู้ดูแลระบบ
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">รายงานย้อนหลัง</h2>
        <p className="text-sm text-gray-500 mt-1">เลือกวันที่เพื่อดูหรือพิมพ์รายงานเวร</p>
      </div>

      <div className="card max-w-md">
        {/* เลือกวันที่ */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            วันที่ต้องการดูรายงาน
          </label>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
          />
          {selectedDate && (
            <p className="text-sm text-gray-500 mt-2">
              📅 {formatThaiDateFull(selectedDate)}
            </p>
          )}
        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="flex flex-col gap-3">
          <Link
            href={chiefUrl}
            className="btn-secondary text-center"
          >
            🔍 ดูสรุปรายงานวันนี้
          </Link>
          <Link
            href={printUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-center"
          >
            🖨️ เปิดหน้าพิมพ์รายงาน
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          หน้าพิมพ์จะเปิดในแท็บใหม่ — ใช้ Ctrl+P หรือ ⌘P เพื่อพิมพ์
        </p>
      </div>
    </div>
  );
}
