"use client";

import { useState } from "react";
import { INSPECTION_POINTS } from "@/lib/inspection-points";
import { formatThaiTime } from "@/lib/thai-time";

// ===== Types =====
type Status = "CLEAN" | "DIRTY" | null;

interface PointState {
  status: Status;
  note: string;
}

interface Props {
  date: string; // "YYYY-MM-DD"
  // ผลตรวจที่มีอยู่แล้ว (จาก server) — map จาก pointCode → {status, note}
  initial: Record<string, { status: string; note: string | null }>;
  submittedAt: string | null; // ISO string หรือ null ถ้ายังไม่เคยบันทึก
  submittedByName: string | null;
}

export default function InspectionForm({
  date,
  initial,
  submittedAt,
  submittedByName,
}: Props) {
  // สร้าง initial state จากข้อมูลที่มีอยู่
  const [results, setResults] = useState<Record<string, PointState>>(() => {
    const r: Record<string, PointState> = {};
    for (const pt of INSPECTION_POINTS) {
      r[pt.code] = {
        status: (initial[pt.code]?.status as Status) ?? null,
        note: initial[pt.code]?.note ?? "",
      };
    }
    return r;
  });

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(submittedAt);
  const [lastSavedBy, setLastSavedBy] = useState<string | null>(submittedByName);
  const [error, setError] = useState<string | null>(null);

  // สลับสถานะ CLEAN/DIRTY (กดซ้ำ = ยกเลิก)
  function toggleStatus(code: string, status: "CLEAN" | "DIRTY") {
    setResults((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        status: prev[code].status === status ? null : status,
      },
    }));
  }

  function setNote(code: string, note: string) {
    setResults((prev) => ({
      ...prev,
      [code]: { ...prev[code], note },
    }));
  }

  // นับจำนวนจุดที่ตรวจแล้ว
  const inspectedCount = Object.values(results).filter((r) => r.status !== null).length;
  const cleanCount = Object.values(results).filter((r) => r.status === "CLEAN").length;
  const dirtyCount = Object.values(results).filter((r) => r.status === "DIRTY").length;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        date,
        results: INSPECTION_POINTS.map((pt) => ({
          pointCode: pt.code,
          pointName: pt.name,
          status: results[pt.code].status,
          note: results[pt.code].note || undefined,
        })).filter((r) => r.status !== null), // ส่งเฉพาะจุดที่ตรวจแล้ว
      };

      const res = await fetch("/api/chief/inspection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }

      setLastSavedAt(data.submittedAt);
      setLastSavedBy(null); // ไม่รู้ชื่อในฝั่ง client — แสดงแค่เวลา
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4">
      {/* หัวข้อ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <div>
            <h3 className="font-semibold text-gray-800 leading-tight">
              การตรวจจุดสำคัญประจำวัน
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">ตรวจสอบความสะอาดและความเรียบร้อย 8 จุด</p>
          </div>
        </div>

        {/* สถานะการบันทึก */}
        {lastSavedAt ? (
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
              ✅ บันทึกแล้ว · {formatThaiTime(lastSavedAt)}
            </span>
            {lastSavedBy && (
              <p className="text-xs text-gray-400 mt-1">โดย {lastSavedBy}</p>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium">
            ยังไม่ได้บันทึก
          </span>
        )}
      </div>

      {/* สรุปจำนวน */}
      {inspectedCount > 0 && (
        <div className="flex gap-3 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            ตรวจแล้ว {inspectedCount}/8 จุด
          </span>
          {cleanCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
              🟢 สะอาด {cleanCount} จุด
            </span>
          )}
          {dirtyCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-700 font-semibold">
              🔴 สกปรก {dirtyCount} จุด
            </span>
          )}
        </div>
      )}

      {/* ตารางจุดตรวจ */}
      <div className="space-y-2">
        {INSPECTION_POINTS.map((pt, idx) => {
          const st = results[pt.code];
          const isClean = st.status === "CLEAN";
          const isDirty = st.status === "DIRTY";

          return (
            <div
              key={pt.code}
              className={`rounded-xl border p-3 transition-colors ${
                isClean
                  ? "border-green-200 bg-green-50"
                  : isDirty
                  ? "border-red-200 bg-red-50"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* เลขที่จุด + ชื่อ */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                      isClean
                        ? "bg-green-200 text-green-800"
                        : isDirty
                        ? "bg-red-200 text-red-800"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {pt.name}
                  </span>
                </div>

                {/* ปุ่ม สะอาด / สกปรก */}
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleStatus(pt.code, "CLEAN")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      isClean
                        ? "bg-green-500 border-green-500 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600"
                    }`}
                  >
                    ✓ สะอาด
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(pt.code, "DIRTY")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      isDirty
                        ? "bg-red-500 border-red-500 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600"
                    }`}
                  >
                    ✗ สกปรก
                  </button>
                </div>
              </div>

              {/* หมายเหตุ (แสดงเสมอถ้ามีสถานะ หรือถ้า dirty) */}
              {(st.status !== null) && (
                <div className="mt-2 pl-8">
                  <input
                    type="text"
                    value={st.note}
                    onChange={(e) => setNote(pt.code, e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)..."
                    className={`w-full text-sm px-3 py-1.5 rounded-lg border outline-none transition ${
                      isDirty
                        ? "border-red-200 bg-red-50 focus:border-red-400 placeholder:text-red-300"
                        : "border-green-200 bg-green-50 focus:border-green-400 placeholder:text-green-300"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {/* ปุ่มบันทึก */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || inspectedCount === 0}
          className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "กำลังบันทึก..." : `บันทึกผลตรวจ (${inspectedCount}/8 จุด)`}
        </button>
      </div>
    </div>
  );
}
