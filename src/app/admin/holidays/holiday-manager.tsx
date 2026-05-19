"use client";

import { useState } from "react";

type Holiday = { id: number; date: string; description: string; thaiDate: string };

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

function toThaiDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function HolidayManager({ initialHolidays }: { initialHolidays: Holiday[] }) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setMsg({ type: "err", text: "กรุณาระบุชื่อวันหยุด" }); return; }
    setSubmitting(true);
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, description }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setHolidays((prev) => [...prev, { ...data.holiday, date: data.holiday.date, thaiDate: toThaiDate(data.holiday.date) }].sort((a, b) => a.date.localeCompare(b.date)));
    setDescription("");
    setMsg({ type: "ok", text: `เพิ่มวันหยุด "${description}" แล้ว` });
  }

  async function handleDelete(id: number, desc: string) {
    if (!confirm(`ลบวันหยุด "${desc}" ออก?`)) return;
    const res = await fetch(`/api/admin/holidays/${id}`, { method: "DELETE" });
    if (!res.ok) { setMsg({ type: "err", text: "ลบไม่สำเร็จ" }); return; }
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    setMsg({ type: "ok", text: `ลบ "${desc}" แล้ว` });
  }

  return (
    <div className="space-y-4 max-w-xl">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* ฟอร์มเพิ่มวันหยุด */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">เพิ่มวันหยุด</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input text-sm w-auto"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ชื่อวันหยุด <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input text-sm"
              placeholder="เช่น วันหยุดนักขัตฤกษ์, วันหยุดชดเชย, ปิดเทอม..."
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary text-sm">
            {submitting ? "กำลังบันทึก..." : "+ เพิ่มวันหยุด"}
          </button>
        </form>
      </div>

      {/* รายการวันหยุด */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">
          รายการวันหยุด{" "}
          <span className="text-xs font-normal text-gray-400">({holidays.length} วัน)</span>
        </h3>
        {holidays.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีวันหยุด</p>
        ) : (
          <div className="space-y-2">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{h.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.thaiDate}</p>
                </div>
                <button
                  onClick={() => handleDelete(h.id, h.description)}
                  className="text-xs text-red-500 hover:underline shrink-0 font-medium"
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
