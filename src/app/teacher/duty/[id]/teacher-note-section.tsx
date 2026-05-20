"use client";

import { useState } from "react";

interface Props {
  assignmentId: number;
  initialNote: string | null;
}

export function TeacherNoteSection({ assignmentId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(!!initialNote);
  const [editing, setEditing] = useState(!initialNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/teacher/duties/${assignmentId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setSaved(true);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit() {
    setEditing(true);
    setSaved(false);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500">หมายเหตุจากครู</h3>
        {saved && !editing && (
          <button
            onClick={handleEdit}
            className="text-xs text-brand-orange-600 hover:text-brand-orange-700 font-medium"
          >
            แก้ไข
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="บันทึกสรุปการปฏิบัติเวร เช่น สภาพพื้นที่ จำนวนนักเรียน สิ่งที่พบ..."
            rows={4}
            className="form-input text-sm resize-none"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2">
            {saved || initialNote ? (
              <button
                onClick={() => { setNote(initialNote ?? ""); setEditing(false); }}
                className="btn-secondary flex-1 text-sm"
                disabled={saving}
              >
                ยกเลิก
              </button>
            ) : null}
            <button
              onClick={handleSave}
              className="btn-primary flex-1 text-sm"
              disabled={saving || !note.trim()}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกหมายเหตุ"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
        </div>
      )}
    </div>
  );
}
