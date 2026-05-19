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

  // จัดกลุ่ม duty types ตาม category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    types: dutyTypes.filter((d) => d.category === cat),
  })).filter((g) => g.types.length > 0);

  return (
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
                  {/* หัว duty type */}
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

                  {/* ครูที่มอบหมายแล้ว */}
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

                  {/* ฟอร์มเพิ่มครู */}
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
    </div>
  );
}
