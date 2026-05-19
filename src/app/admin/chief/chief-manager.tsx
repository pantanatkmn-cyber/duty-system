"use client";

import { useState } from "react";

const DAY_NAMES = [
  { value: 1, label: "วันจันทร์" },
  { value: 2, label: "วันอังคาร" },
  { value: 3, label: "วันพุธ" },
  { value: 4, label: "วันพฤหัสบดี" },
  { value: 5, label: "วันศุกร์" },
];

type Assignment = { dayOfWeek: number; userId: number; fullName: string };
type User = { id: number; fullName: string; role: string };

export function WeeklyChiefManager({
  initialAssignments,
  users,
}: {
  initialAssignments: Assignment[];
  users: User[];
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [editing, setEditing] = useState<number | null>(null); // dayOfWeek ที่กำลังแก้
  const [selectedUserId, setSelectedUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function getChief(dayOfWeek: number) {
    return assignments.find((a) => a.dayOfWeek === dayOfWeek) ?? null;
  }

  function startEdit(dayOfWeek: number) {
    setEditing(dayOfWeek);
    const current = getChief(dayOfWeek);
    setSelectedUserId(current ? String(current.userId) : "");
    setMsg(null);
  }

  function cancelEdit() {
    setEditing(null);
    setSelectedUserId("");
  }

  async function handleSave(dayOfWeek: number) {
    if (!selectedUserId) { setMsg({ type: "err", text: "กรุณาเลือกครู" }); return; }
    setSubmitting(true);
    const res = await fetch("/api/admin/weekly-chief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, userId: parseInt(selectedUserId) }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }

    const newAssignment: Assignment = {
      dayOfWeek: data.assignment.dayOfWeek,
      userId: data.assignment.user.id,
      fullName: data.assignment.user.fullName,
    };
    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.dayOfWeek !== dayOfWeek);
      return [...filtered, newAssignment].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
    setEditing(null);
    setSelectedUserId("");
    setMsg({
      type: "ok",
      text: `กำหนด "${newAssignment.fullName}" เป็นหัวหน้าเวร${DAY_NAMES.find((d) => d.value === dayOfWeek)?.label} แล้ว`,
    });
  }

  async function handleRemove(dayOfWeek: number, name: string) {
    if (!confirm(`ลบ "${name}" ออกจากหัวหน้าเวร${DAY_NAMES.find((d) => d.value === dayOfWeek)?.label}?`)) return;
    const res = await fetch(`/api/admin/weekly-chief?dayOfWeek=${dayOfWeek}`, { method: "DELETE" });
    if (!res.ok) { setMsg({ type: "err", text: "ลบไม่สำเร็จ" }); return; }
    setAssignments((prev) => prev.filter((a) => a.dayOfWeek !== dayOfWeek));
    setMsg({ type: "ok", text: `ลบหัวหน้าเวร${DAY_NAMES.find((d) => d.value === dayOfWeek)?.label} แล้ว` });
  }

  return (
    <div className="space-y-4 max-w-xl">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">วัน</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">หัวหน้าเวร</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {DAY_NAMES.map((day) => {
              const chief = getChief(day.value);
              const isEditing = editing === day.value;

              return (
                <tr key={day.value} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-700">{day.label}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="form-input text-sm"
                        autoFocus
                      >
                        <option value="">— เลือกครู —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.fullName}</option>
                        ))}
                      </select>
                    ) : chief ? (
                      <span className="font-medium text-brand-orange-700">{chief.fullName}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">ยังไม่ได้กำหนด</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={cancelEdit} className="text-xs text-gray-500 hover:underline" disabled={submitting}>
                          ยกเลิก
                        </button>
                        <button
                          onClick={() => handleSave(day.value)}
                          disabled={submitting || !selectedUserId}
                          className="text-xs text-white bg-brand-orange-500 hover:bg-brand-orange-600 px-3 py-1 rounded-lg disabled:opacity-50"
                        >
                          {submitting ? "บันทึก..." : "บันทึก"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => startEdit(day.value)}
                          className="text-xs text-brand-orange-600 hover:underline font-medium"
                        >
                          {chief ? "เปลี่ยน" : "กำหนด"}
                        </button>
                        {chief && (
                          <>
                            <span className="text-gray-200">|</span>
                            <button
                              onClick={() => handleRemove(day.value, chief.fullName)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              ลบ
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
