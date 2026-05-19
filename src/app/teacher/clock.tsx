"use client";

import { useEffect, useState } from "react";

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function formatThaiDate(date: Date) {
  const day = THAI_DAYS[date.getDay()];
  const d = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `วัน${day}ที่ ${d} ${month} พ.ศ. ${year}`;
}

function formatTime(date: Date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <div className="card text-center py-6">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-48 mx-auto mb-2" />
        <div className="h-12 bg-gray-100 rounded animate-pulse w-40 mx-auto" />
      </div>
    );
  }

  return (
    <div className="card text-center py-6">
      <p className="text-sm text-gray-500 mb-1">{formatThaiDate(now)}</p>
      <p className="text-4xl font-bold text-brand-orange-600 tabular-nums tracking-wide">
        {formatTime(now)}
      </p>
    </div>
  );
}
