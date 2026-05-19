"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChiefInfo = { id: number; userId: number; fullName: string };
type User = { id: number; fullName: string; role: string };

export function ChiefManager({
  dateStr, todayStr, currentChief, users,
}: {
  dateStr: string;
  todayStr: string;
  currentChief: ChiefInfo | null;
  users: User[];
}) {
  const router = useRouter();
  const [chief, setChief] = useState<ChiefInfo | null>(currentChief);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function changeDate(d: string) {
    if (d) router.push(`/admin/chief?date=${d}`);
  }

  async function handleSet() {
    if (!selectedUserId) { setMsg({ type: "err", text: "กรุณาเลือกครู" }); return; }
    setSubmitting(true);
    const res = await fetch("/api/admin/chief-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parseInt(selectedUserId), dutyDate: dateStr }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setChief({ id: data.chief.id, userId: data.chief.userId, fullName: data.chief.user.fullName });
    setSelectedUserId("");
    setMsg({ type: "ok", text: `กำหนด "${data.chief.user.fullName}" เป็นหัวหน้าเวรแล้ว` });
  }

  async function handleRemove() {
    if (!chief) return;
    if (!confirm(`ลบหัวหน้าเวร "${chief.fullName}" ออก?`)) return;
    const res = await fetch(`/api/admin/chief-assignments/${chief.id}`, { method: "DELETE" });
    if (!res.ok) { setMsg({ type: "err", text: "ลบไม่สำเร็จ" }); return; }
    setChief(null);
    setMsg({ type: "ok", text: "ลบหัวหน้าเวรแล้ว" });
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Date picker */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">วันที่:</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => changeDate(e.target.value)}
            className="form-input text-sm w-auto"
          />
          {dateStr === todayStr && <span className="badge badge-success text-xs">วันนี้</span>}
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* หัวหน้าเวรปัจจุบัน */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">หัวหน้าเวรประจำวันที่เลือก</h3>
        {chief ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-orange-50 border border-brand-orange-200 px-4 py-3">
            <div>
              <p className="font-semibold text-brand-orange-800">{chief.fullName}</p>
              <p className="text-xs text-brand-orange-600 mt-0.5">หัวหน้าเวรประจำวัน</p>
            </div>
            <button
              onClick={handleRemove}
              className="text-sm text-red-500 hover:underline font-medium shrink-0"
            >
              ลบออก
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">ยังไม่ได้กำหนดหัวหน้าเวรสำหรับวันนี้</p>
        )}
      </div>

      {/* ฟอร์มกำหนดหัวหน้าเวร */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">
          {chief ? "เปลี่ยนหัวหน้าเวร" : "กำหนดหัวหน้าเวร"}
        </h3>
        <div className="flex gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="form-input text-sm flex-1"
          >
            <option value="">— เลือกครู —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName}</option>
            ))}
          </select>
          <button
            onClick={handleSet}
            disabled={submitting || !selectedUserId}
            className="btn-primary text-sm shrink-0"
          >
            {submitting ? "กำลังบันทึก..." : "กำหนด"}
          </button>
        </div>
      </div>
    </div>
  );
}
