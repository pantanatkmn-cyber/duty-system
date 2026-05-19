"use client";

import { useState } from "react";

export function SettingsForm({ gracePeriod }: { gracePeriod: number }) {
  const [value, setValue] = useState(gracePeriod);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSave() {
    if (value < 0 || value > 60) {
      setMsg({ type: "err", text: "ค่าต้องอยู่ระหว่าง 0 ถึง 60 นาที" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "grace_period_minutes", value }),
    });
    setSaving(false);
    if (!res.ok) { setMsg({ type: "err", text: "บันทึกไม่สำเร็จ" }); return; }
    setMsg({ type: "ok", text: "บันทึกการตั้งค่าแล้ว" });
  }

  return (
    <div className="space-y-4 max-w-lg">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-gray-800">เวลาผ่อนผัน (Grace Period)</h3>
          <p className="text-sm text-gray-500 mt-1">
            จำนวนนาทีที่ผ่อนผันหลังเวลาเริ่มเวร ก่อนจะนับเป็น "สาย"
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={60}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            className="form-input text-sm w-24 text-center text-lg font-bold"
          />
          <span className="text-gray-600 text-sm">นาที</span>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
          <p>
            ตัวอย่าง: ถ้าเวรเริ่ม 07:30 และ grace period = <strong>{value} นาที</strong>
          </p>
          <p className="mt-1">
            → เช็กอินก่อน <strong>
              {String(7 + Math.floor((30 + value) / 60)).padStart(2, "0")}:{String((30 + value) % 60).padStart(2, "0")} น.
            </strong> = ตรงเวลา
          </p>
          <p className="mt-0.5">
            → เช็กอินหลัง{" "}
            <strong>
              {String(7 + Math.floor((30 + value) / 60)).padStart(2, "0")}:{String((30 + value) % 60).padStart(2, "0")} น.
            </strong>{" "}
            = สาย
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm"
        >
          {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
}
