"use client";

import { useState } from "react";

interface Props {
  gracePeriod: number;
  schoolEndTime: string; // "HH:mm"
}

export function SettingsForm({ gracePeriod, schoolEndTime }: Props) {
  const [grace, setGrace] = useState(gracePeriod);
  const [endTime, setEndTime] = useState(schoolEndTime);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function saveSetting(key: string, value: string | number) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: String(value) }),
    });
    return res.ok;
  }

  async function handleSave() {
    if (grace < 0 || grace > 60) {
      setMsg({ type: "err", text: "Grace period ต้องอยู่ระหว่าง 0 ถึง 60 นาที" });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(endTime)) {
      setMsg({ type: "err", text: "รูปแบบเวลาเลิกงานไม่ถูกต้อง (ใช้ HH:mm)" });
      return;
    }
    setSaving(true);
    const [ok1, ok2] = await Promise.all([
      saveSetting("grace_period_minutes", grace),
      saveSetting("school_end_time", endTime),
    ]);
    setSaving(false);
    if (!ok1 || !ok2) {
      setMsg({ type: "err", text: "บันทึกไม่สำเร็จ" });
    } else {
      setMsg({ type: "ok", text: "บันทึกการตั้งค่าแล้ว" });
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="card space-y-4">
        {/* Grace Period เวรคาบ */}
        <div>
          <h3 className="font-semibold text-gray-800">ผ่อนผันสาย — เวรคาบ</h3>
          <p className="text-sm text-gray-500 mt-1">
            จำนวนนาทีผ่อนผันหลังเวลาเริ่มเวรคาบ ก่อนจะนับว่า "สาย"
            <br/>
            <span className="text-xs text-brand-orange-600">เวรประตูหน้า / เวรประจำจุด: ไม่มีผ่อนผัน (สายทันทีถ้าเกินเวลา)</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={60}
            value={grace}
            onChange={(e) => setGrace(parseInt(e.target.value) || 0)}
            className="form-input text-sm w-24 text-center text-lg font-bold"
          />
          <span className="text-gray-600 text-sm">นาที</span>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
          <p>เวรคาบที่เริ่ม 09:20 น. → เช็กอินก่อน{" "}
            <strong>{String(9 + Math.floor((20 + grace) / 60)).padStart(2, "0")}:{String((20 + grace) % 60).padStart(2, "0")} น.</strong>{" "}
            = ตรงเวลา
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        {/* เวลาเลิกงาน */}
        <div>
          <h3 className="font-semibold text-gray-800">เวลาเลิกงาน (School End Time)</h3>
          <p className="text-sm text-gray-500 mt-1">
            เวลาที่ครูเวรประตูหน้า / เวรประจำจุด สามารถออกเวรได้
            <br/>
            <span className="text-xs text-gray-400">หากไม่ออกเวรภายใน ระบบจะแสดง "ลืมออกเวร"</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="form-input text-sm w-36 font-bold"
          />
          <span className="text-gray-600 text-sm">น.</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary text-sm"
      >
        {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า"}
      </button>
    </div>
  );
}
