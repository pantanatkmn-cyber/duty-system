"use client";

import { useState } from "react";

export interface DutyTypeTime {
  id: number;
  name: string;
  category: string;
  startTime: string;
  endTime: string;
}

interface Props {
  dutyTypes: DutyTypeTime[];
}

const CATEGORY_LABEL: Record<string, string> = {
  FRONT_GATE: "🏫 เวรประตูหน้า",
  POINT:      "📍 เวรประจำจุด",
  PERIOD:     "📚 เวรคาบ",
};
const CATEGORY_ORDER = ["FRONT_GATE", "POINT", "PERIOD"];

export function DutyTimesForm({ dutyTypes }: Props) {
  // state เป็น map id → { startTime, endTime }
  const [times, setTimes] = useState<Record<number, { startTime: string; endTime: string }>>(
    Object.fromEntries(dutyTypes.map((d) => [d.id, { startTime: d.startTime, endTime: d.endTime }]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function setTime(id: number, field: "startTime" | "endTime", value: string) {
    setTimes((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = dutyTypes.map((d) => ({
        id: d.id,
        startTime: times[d.id].startTime,
        endTime: times[d.id].endTime,
      }));
      const res = await fetch("/api/admin/duty-types/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ types: payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "บันทึกไม่สำเร็จ");
      }
      setMsg({ type: "ok", text: "✅ บันทึกเวลาเวรทั้งหมดแล้ว" });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    label: CATEGORY_LABEL[cat] ?? cat,
    items: dutyTypes.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5 max-w-2xl">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {msg.text}
        </div>
      )}

      {grouped.map(({ cat, label, items }) => (
        <div key={cat} className="card">
          <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">{label}</h3>
          <div className="space-y-2">
            {/* header */}
            <div className="grid grid-cols-[1fr_100px_100px] gap-3 px-1">
              <span className="text-xs font-semibold text-gray-400 uppercase">ชื่อเวร</span>
              <span className="text-xs font-semibold text-gray-400 uppercase text-center">เริ่ม</span>
              <span className="text-xs font-semibold text-gray-400 uppercase text-center">สิ้นสุด</span>
            </div>
            {items.map((d) => (
              <div key={d.id} className="grid grid-cols-[1fr_100px_100px] gap-3 items-center rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-800 font-medium truncate">{d.name}</span>
                <input
                  type="time"
                  value={times[d.id].startTime}
                  onChange={(e) => setTime(d.id, "startTime", e.target.value)}
                  className="form-input text-sm text-center font-semibold px-1"
                />
                <input
                  type="time"
                  value={times[d.id].endTime}
                  onChange={(e) => setTime(d.id, "endTime", e.target.value)}
                  className="form-input text-sm text-center font-semibold px-1"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? "กำลังบันทึก..." : "💾 บันทึกเวลาเวร"}
      </button>
    </div>
  );
}
