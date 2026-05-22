"use client";

import { useState } from "react";

export interface AllSettings {
  // เวรประตูหน้า
  front_gate_grace_minutes: number;
  front_gate_checkout_time: string;
  front_gate_forgot_time: string;
  // เวรประจำจุด
  point_grace_minutes: number;
  point_checkout_time: string;
  point_forgot_time: string;
  // เวรคาบ
  period_grace_minutes: number;
  period_forgot_time: string;
}

interface Props { settings: AllSettings }

const CATEGORY_SECTIONS = [
  {
    key: "front_gate" as const,
    label: "เวรประตูหน้า",
    icon: "🏫",
    note: "เวลาเข้าเวรเทียบกับเวลาเริ่มเวรใน DutyType (07:30) — ถ้าเกินเวลา = สายทันที",
    hasCheckout: true,
  },
  {
    key: "point" as const,
    label: "เวรประจำจุด",
    icon: "📍",
    note: "เวลาเข้าเวรเทียบกับเวลาเริ่มแต่ละจุดใน DutyType — ถ้าเกิน = สาย",
    hasCheckout: true,
  },
  {
    key: "period" as const,
    label: "เวรคาบ",
    icon: "📚",
    note: "เวลาออกเวรใช้เวลาสิ้นสุดของแต่ละคาบ · ตั้งเวลาลืมออกเวรได้",
    hasCheckout: false,
  },
];

export function SettingsForm({ settings }: Props) {
  const [vals, setVals] = useState<AllSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function set(key: keyof AllSettings, value: string | number) {
    setVals((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const entries = Object.entries(vals).map(([key, value]) => ({ key, value: String(value) }));
      const res = await fetch("/api/admin/settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: entries }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      setMsg({ type: "ok", text: "✅ บันทึกการตั้งค่าทั้งหมดแล้ว" });
    } catch {
      setMsg({ type: "err", text: "เกิดข้อผิดพลาด กรุณาลองใหม่" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {msg.text}
        </div>
      )}

      {CATEGORY_SECTIONS.map((sec) => {
        const graceKey = `${sec.key}_grace_minutes` as keyof AllSettings;
        const checkoutKey = `${sec.key}_checkout_time` as keyof AllSettings;
        const forgotKey = `${sec.key}_forgot_time` as keyof AllSettings;

        return (
          <div key={sec.key} className="card space-y-4">
            {/* หัว section */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="text-2xl">{sec.icon}</span>
              <div>
                <h3 className="font-bold text-gray-800">{sec.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{sec.note}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ผ่อนผันเข้าสาย */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⏱ ผ่อนผันเข้าสาย
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={vals[graceKey] as number}
                    onChange={(e) => set(graceKey, parseInt(e.target.value) || 0)}
                    className="form-input text-sm w-20 text-center font-bold"
                  />
                  <span className="text-sm text-gray-500">นาที</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {vals[graceKey] === 0
                    ? "สายทันทีถ้าเกินเวลาเริ่มเวร"
                    : `สายถ้าเกินเวลาเริ่มเวร + ${vals[graceKey]} นาที`}
                </p>
              </div>

              {/* เวลาออกเวร */}
              {sec.hasCheckout ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🚪 ออกเวรได้ตั้งแต่
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={vals[checkoutKey] as string}
                      onChange={(e) => set(checkoutKey, e.target.value)}
                      className="form-input text-sm w-36 font-bold"
                    />
                    <span className="text-sm text-gray-500">น.</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ออกก่อนนี้ = "ออกก่อนกำหนด"</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🚪 ออกเวรได้ตั้งแต่
                  </label>
                  <p className="text-sm text-gray-400 mt-2">ใช้เวลาสิ้นสุดคาบอัตโนมัติ</p>
                </div>
              )}

              {/* เวลาลืมออกเวร — FRONT_GATE/POINT ใช้ input, PERIOD ใช้ input เช่นกัน */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ⚠️ ขึ้น "ลืมออกเวร" หลัง
                </label>
                {sec.hasCheckout ? (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={vals[forgotKey] as string}
                        onChange={(e) => set(forgotKey, e.target.value)}
                        className="form-input text-sm w-36 font-bold"
                      />
                      <span className="text-sm text-gray-500">น.</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">ถ้าไม่กดออกเวรภายในเวลานี้</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={(vals as Record<string, string | number>)["period_forgot_time"] as string}
                        onChange={(e) => set("period_forgot_time" as keyof AllSettings, e.target.value)}
                        className="form-input text-sm w-36 font-bold"
                      />
                      <span className="text-sm text-gray-500">น.</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">หากไม่ตั้งค่า จะใช้เวลาสิ้นสุดของแต่ละคาบ</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
      >
        {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่าทั้งหมด"}
      </button>
    </div>
  );
}
