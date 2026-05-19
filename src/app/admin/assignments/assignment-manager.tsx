"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ===== Types =====
type DutyType = {
  id: number; code: string; name: string; category: string;
  startTime: string; endTime: string; description?: string | null;
};

type Assignment = {
  id: number; userId: number; dutyTypeId: number; note: string | null;
  user: { id: number; fullName: string };
  dutyType: { id: number; name: string; category: string; startTime: string; endTime: string };
};

type User = { id: number; fullName: string; role: string };

// ===== ค่าคงที่ =====
const CATEGORY_LABEL: Record<string, string> = {
  FRONT_GATE: "เวรประตูหน้า",
  POINT: "เวรประจำจุด",
  PERIOD: "เวรคาบ",
};
const CATEGORY_ORDER = ["FRONT_GATE", "POINT", "PERIOD"];

const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const THAI_MONTHS = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return THAI_DAYS[new Date(y, m - 1, d).getDay()];
}

function formatThaiShort(date: Date): string {
  return `${THAI_DAYS[date.getDay()]}ที่ ${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function getRepeatDates(dateStr: string, weeks: number): Date[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  return Array.from({ length: weeks }, (_, i) => {
    const dt = new Date(base);
    dt.setDate(base.getDate() + (i + 1) * 7);
    return dt;
  });
}

// ===== Component =====
export function AssignmentManager({
  dateStr, todayStr, dutyTypes, initialAssignments, users,
}: {
  dateStr: string;
  todayStr: string;
  dutyTypes: DutyType[];
  initialAssignments: Assignment[];
  users: User[];
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [addingDutyTypeId, setAddingDutyTypeId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ===== state สำหรับ repeat modal =====
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [repeatWeeks] = useState(18);

  const dayName = getDayName(dateStr);
  const repeatDates = getRepeatDates(dateStr, repeatWeeks);

  // ===== ฟังก์ชัน =====
  function changeDate(d: string) {
    if (d) router.push(`/admin/assignments?date=${d}`);
  }

  async function handleClearAll() {
    if (!confirm(`ล้างเวรทั้งหมดในวันที่ ${dateStr} ออก?\nข้อมูลเช็กอินและรายงานเหตุการณ์ในวันนั้นจะถูกลบด้วย`)) return;
    const res = await fetch(`/api/admin/assignments?date=${dateStr}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "ลบไม่สำเร็จ" }); return; }
    setAssignments([]);
    setAddingDutyTypeId(null);
    setMsg({ type: "ok", text: `ล้างเวรทั้งหมด ${data.deleted} รายการแล้ว` });
  }

  function openAdd(dutyTypeId: number) {
    setAddingDutyTypeId(dutyTypeId);
    setSelectedUserId("");
    setNote("");
    setMsg(null);
  }

  function cancelAdd() {
    setAddingDutyTypeId(null);
    setSelectedUserId("");
    setNote("");
  }

  async function handleAdd() {
    if (!selectedUserId) { setMsg({ type: "err", text: "กรุณาเลือกครู" }); return; }
    setSubmitting(true);
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: parseInt(selectedUserId),
        dutyTypeId: addingDutyTypeId,
        dutyDate: dateStr,
        note: note.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setAssignments((prev) => [...prev, data.assignment]);
    setAddingDutyTypeId(null);
    setSelectedUserId("");
    setNote("");
    setMsg({ type: "ok", text: `มอบหมายเวรให้ "${data.assignment.user.fullName}" แล้ว` });
  }

  async function handleDelete(assignmentId: number, teacherName: string) {
    if (!confirm(`ลบเวรของ "${teacherName}" ออก?`)) return;
    const res = await fetch(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
    if (!res.ok) { setMsg({ type: "err", text: "ลบไม่สำเร็จ" }); return; }
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    setMsg({ type: "ok", text: `ลบเวรของ "${teacherName}" แล้ว` });
  }

  async function handleRepeat() {
    setRepeating(true);
    const res = await fetch("/api/admin/assignments/repeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, weeks: repeatWeeks }),
    });
    const data = await res.json();
    setRepeating(false);
    setShowRepeat(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setMsg({
      type: "ok",
      text: `✅ ทำซ้ำเวรวัน${dayName}สำเร็จ! สร้าง ${data.created} รายการใน ${data.weeks} สัปดาห์ถัดไป`,
    });
  }

  // จัดกลุ่ม duty types ตาม category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    types: dutyTypes.filter((d) => d.category === cat),
  })).filter((g) => g.types.length > 0);

  return (
    <>
      <div className="space-y-4">
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
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-400">รวม {assignments.length} เวร</span>
              {assignments.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 transition"
                >
                  🗑️ ล้างเวรทั้งหมดวันนี้
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
            {msg.text}
          </div>
        )}

        {/* รายการเวรแยกตามประเภท */}
        {grouped.map((group) => (
          <div key={group.category} className="card">
            <h3 className="font-semibold text-gray-700 mb-3">{group.label}</h3>
            <div className="space-y-3">
              {group.types.map((dt) => {
                const dtAssignments = assignments.filter((a) => a.dutyTypeId === dt.id);
                const assignedUserIds = new Set(dtAssignments.map((a) => a.userId));
                const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));
                const isAdding = addingDutyTypeId === dt.id;

                return (
                  <div key={dt.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{dt.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {dt.startTime}–{dt.endTime} น.
                        </span>
                      </div>
                      {!isAdding && availableUsers.length > 0 && (
                        <button
                          onClick={() => openAdd(dt.id)}
                          className="text-xs text-brand-orange-600 hover:text-brand-orange-700 font-medium shrink-0"
                        >
                          + เพิ่มครู
                        </button>
                      )}
                    </div>

                    {dtAssignments.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {dtAssignments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                          >
                            {a.user.fullName}
                            <button
                              onClick={() => handleDelete(a.id, a.user.fullName)}
                              className="text-gray-400 hover:text-red-500 ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-2">ยังไม่มีครูเวร</p>
                    )}

                    {isAdding && (
                      <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="form-input text-sm"
                        >
                          <option value="">— เลือกครู —</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.fullName}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="form-input text-sm"
                          placeholder="หมายเหตุ (ไม่บังคับ)"
                        />
                        <div className="flex gap-2">
                          <button onClick={cancelAdd} className="btn-secondary flex-1 text-sm !py-1.5" disabled={submitting}>
                            ยกเลิก
                          </button>
                          <button onClick={handleAdd} className="btn-primary flex-1 text-sm !py-1.5" disabled={submitting}>
                            {submitting ? "กำลังบันทึก..." : "มอบหมาย"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ===== แผงสรุป + ปุ่มบันทึก + ปุ่มทำซ้ำ ===== */}
        {assignments.length > 0 && (
          <div className="card border-brand-orange-200 bg-brand-orange-50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-orange-800">
                  ✅ บันทึกเวรวัน{dayName}แล้ว — {assignments.length} รายการ
                </p>
                <p className="text-xs text-brand-orange-600 mt-0.5">
                  ระบบบันทึกทุกรายการทันทีที่มอบหมาย
                </p>
              </div>
              <button
                onClick={() => setShowRepeat(true)}
                className="btn-primary text-sm shrink-0"
              >
                🔁 ทำซ้ำวัน{dayName}นี้ {repeatWeeks} สัปดาห์
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Modal ยืนยันทำซ้ำ ===== */}
      {showRepeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-brand-orange-500 px-5 py-4">
              <h3 className="text-white font-bold text-base">
                🔁 ทำซ้ำเวรวัน{dayName}
              </h3>
              <p className="text-white/80 text-sm mt-0.5">
                คัดลอก {assignments.length} เวร ไปยัง {repeatWeeks} สัปดาห์ถัดไป
              </p>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-700 mb-3 font-medium">
                วันที่จะสร้างเวรให้:
              </p>

              {/* รายการวันที่ */}
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 divide-y divide-gray-100">
                {repeatDates.map((date, i) => (
                  <div key={i} className="flex items-center px-3 py-2 text-sm">
                    <span className="w-6 text-xs text-gray-400 shrink-0">{i + 1}.</span>
                    <span className="text-gray-700">{formatThaiShort(date)}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                * ถ้าวันนั้นมีเวรของครูคนเดิมอยู่แล้ว จะข้ามไป (ไม่ซ้ำ)
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRepeat(false)}
                  className="btn-secondary flex-1"
                  disabled={repeating}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRepeat}
                  className="btn-primary flex-1"
                  disabled={repeating}
                >
                  {repeating ? "กำลังสร้าง..." : `✓ ยืนยัน ${repeatWeeks} สัปดาห์`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
