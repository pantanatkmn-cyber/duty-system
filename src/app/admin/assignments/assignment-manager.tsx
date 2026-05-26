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

  // ===== state modals =====
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [repeatWeeks] = useState(18);
  const [showConfirm, setShowConfirm] = useState(false); // modal ยืนยันเวรวันนี้
  const [showClear, setShowClear] = useState(false);     // modal ล้างเวรวันนี้
  const [clearing, setClearing] = useState(false);
  const [showClearAll, setShowClearAll] = useState(false); // modal ล้างทั้งระบบ ชั้น 1
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false); // modal ล้างทั้งระบบ ชั้น 2
  const [clearAllInput, setClearAllInput] = useState(""); // ต้องพิมพ์ "ยืนยัน"
  const [clearingAll, setClearingAll] = useState(false);

  const dayName = getDayName(dateStr);
  const repeatDates = getRepeatDates(dateStr, repeatWeeks);

  // ===== ฟังก์ชัน =====
  function changeDate(d: string) {
    if (d) router.push(`/admin/assignments?date=${d}`);
  }

  async function handleClearAll() {
    setClearing(true);
    const res = await fetch(`/api/admin/assignments?date=${dateStr}`, { method: "DELETE" });
    const data = await res.json();
    setClearing(false);
    setShowClear(false);
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

  async function handleClearAllSystem() {
    setClearingAll(true);
    const res = await fetch("/api/admin/assignments/clear-all", { method: "DELETE" });
    const data = await res.json();
    setClearingAll(false);
    setShowClearAllConfirm(false);
    setClearAllInput("");
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "ลบไม่สำเร็จ" }); return; }
    setAssignments([]);
    setAddingDutyTypeId(null);
    setMsg({ type: "ok", text: `🗑️ ล้างข้อมูลเวรทั้งหมดในระบบแล้ว — ${data.deleted} รายการ` });
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
    const parts = [`เพิ่ม ${data.created} รายการ`];
    if (data.deleted > 0) parts.push(`ลบ ${data.deleted} รายการที่ไม่ตรง`);
    if (data.skipped > 0) parts.push(`ข้าม ${data.skipped} รายการที่เช็กอินแล้ว`);
    setMsg({
      type: "ok",
      text: `✅ ปรับปรุงเวรวัน${dayName}สำเร็จใน ${data.weeks} สัปดาห์ถัดไป (${parts.join(", ")})`,
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
              <button
                onClick={() => setShowClearAll(true)}
                className="text-xs text-red-400 hover:text-red-600 font-medium border border-red-100 hover:border-red-300 rounded-lg px-3 py-1.5 transition"
              >
                ⚠️ ล้างข้อมูลทั้งระบบ
              </button>
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

        {/* ===== Action Panel ===== */}
        {assignments.length > 0 && (
          <div className="card border-gray-200">
            {/* สรุปสถานะ */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <span className="text-lg">📋</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  เวรวัน{dayName} — {assignments.length} รายการ
                </p>
                <p className="text-xs text-gray-400 mt-0.5">บันทึกทุกรายการทันทีที่มอบหมาย</p>
              </div>
            </div>

            {/* 3 ปุ่ม */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ปุ่มยืนยันเวรวันนี้ */}
              <button
                onClick={() => setShowConfirm(true)}
                className="btn-primary flex items-center justify-center gap-2 text-sm"
              >
                <span>✅</span>
                <span>ยืนยันเวรวันนี้</span>
              </button>

              {/* ปุ่มบันทึกเวรซ้ำ */}
              <button
                onClick={() => setShowRepeat(true)}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <span>🔁</span>
                <span>บันทึกเวรนี้ซ้ำ {repeatWeeks} สัปดาห์</span>
              </button>

              {/* ปุ่มล้างเวร */}
              <button
                onClick={() => setShowClear(true)}
                className="flex items-center justify-center gap-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl px-4 py-2.5 hover:bg-red-50 hover:border-red-300 transition"
              >
                <span>🗑️</span>
                <span>ล้างเวรทั้งหมดวันนี้</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== Modal ยืนยันเวรวันนี้ ===== */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-brand-orange-500 px-5 py-4">
              <h3 className="text-white font-bold text-base">✅ ยืนยันเวรวัน{dayName}</h3>
              <p className="text-white/80 text-sm mt-0.5">
                รายการเวรทั้งหมดถูกบันทึกแล้ว
              </p>
            </div>
            <div className="p-5">
              {/* สรุปรายการเวร */}
              <div className="space-y-3 mb-4">
                {CATEGORY_ORDER.map((cat) => {
                  const catAssignments = assignments.filter((a) => a.dutyType.category === cat);
                  if (catAssignments.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">{CATEGORY_LABEL[cat]}</p>
                      <div className="space-y-1">
                        {catAssignments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="text-gray-800 font-medium">{a.user.fullName}</span>
                            <span className="text-xs text-gray-400">{a.dutyType.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 mb-4">
                ✅ เวรทั้ง {assignments.length} รายการบันทึกเรียบร้อยแล้ว
              </div>
              <button
                onClick={() => { setShowConfirm(false); setMsg({ type: "ok", text: `✅ ยืนยันเวรวัน${dayName}แล้ว — ${assignments.length} รายการ` }); }}
                className="btn-primary w-full"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal ยืนยันล้างเวร ===== */}
      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-red-500 px-5 py-4">
              <h3 className="text-white font-bold text-base">🗑️ ล้างเวรวัน{dayName}</h3>
              <p className="text-white/80 text-sm mt-0.5">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 mb-2">
                จะลบเวรทั้งหมด <span className="font-bold text-red-600">{assignments.length} รายการ</span> ในวันนี้
              </p>
              <p className="text-xs text-gray-500 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                ⚠️ ข้อมูลเช็กอินและรายงานเหตุการณ์ในวันนั้นจะถูกลบด้วย
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClear(false)}
                  className="btn-secondary flex-1"
                  disabled={clearing}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl px-4 py-2.5 transition text-sm"
                  disabled={clearing}
                >
                  {clearing ? "กำลังลบ..." : "ยืนยันลบทั้งหมด"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal ล้างทั้งระบบ ชั้น 1: เตือน ===== */}
      {showClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-red-600 px-5 py-4">
              <h3 className="text-white font-bold text-base">⚠️ ล้างข้อมูลทั้งหมดในระบบ</h3>
              <p className="text-white/80 text-sm mt-0.5">การดำเนินการนี้อันตรายมาก</p>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-800 font-medium">ข้อมูลที่จะถูกลบถาวร:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-none">
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> เวรทั้งหมดทุกวันในระบบ</li>
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> ข้อมูลการเช็กอิน/ออกเวรทุกรายการ</li>
                <li className="flex items-center gap-2"><span className="text-red-500">✕</span> รายงานเหตุการณ์และรูปถ่ายทั้งหมด</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
                ⚠️ ไม่สามารถกู้คืนข้อมูลได้หลังจากลบแล้ว
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowClearAll(false)}
                  className="btn-secondary flex-1"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => { setShowClearAll(false); setShowClearAllConfirm(true); setClearAllInput(""); }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl px-4 py-2.5 transition text-sm"
                >
                  ดำเนินการต่อ →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal ล้างทั้งระบบ ชั้น 2: พิมพ์ยืนยัน ===== */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-red-700 px-5 py-4">
              <h3 className="text-white font-bold text-base">🔐 ยืนยันการลบครั้งสุดท้าย</h3>
              <p className="text-white/80 text-sm mt-0.5">พิมพ์ข้อความเพื่อยืนยัน</p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                พิมพ์ <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">ยืนยัน</span> เพื่อดำเนินการลบข้อมูลทั้งหมด
              </p>
              <input
                type="text"
                value={clearAllInput}
                onChange={(e) => setClearAllInput(e.target.value)}
                placeholder="พิมพ์ ยืนยัน ตรงนี้"
                className="form-input text-sm"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowClearAllConfirm(false); setClearAllInput(""); }}
                  className="btn-secondary flex-1"
                  disabled={clearingAll}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleClearAllSystem}
                  disabled={clearAllInput !== "ยืนยัน" || clearingAll}
                  className="flex-1 bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl px-4 py-2.5 transition text-sm"
                >
                  {clearingAll ? "กำลังลบ..." : "🗑️ ลบข้อมูลทั้งหมด"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal ยืนยันบันทึกเวรซ้ำ ===== */}
      {showRepeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-brand-orange-500 px-5 py-4">
              <h3 className="text-white font-bold text-base">
                🔁 บันทึกเวรวัน{dayName}นี้ซ้ำ {repeatWeeks} สัปดาห์
              </h3>
              <p className="text-white/80 text-sm mt-0.5">
                บันทึกรายชื่อครูเวร {assignments.length} คน/เวร ในวันนี้ ไปยังวัน{dayName}อีก {repeatWeeks} สัปดาห์ถัดไป
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

              <div className="mt-3 space-y-1.5 text-xs">
                <p className="text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                  ✅ เพิ่มครูที่อยู่ในวันนี้แต่ยังไม่มีในสัปดาห์นั้น
                </p>
                <p className="text-red-700 bg-red-50 rounded-lg px-3 py-1.5">
                  🗑️ ลบครูที่ไม่อยู่ในวันนี้ออกจากสัปดาห์นั้น (เฉพาะที่ยังไม่เช็กอิน)
                </p>
                <p className="text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                  ⚠️ เวรที่เช็กอินแล้วจะไม่ถูกแตะต้อง
                </p>
              </div>

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
                  {repeating ? "กำลังบันทึก..." : `✓ บันทึกเวรซ้ำ ${repeatWeeks} สัปดาห์`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
