"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setMsg({ type: "err", text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: "err", text: "รหัสผ่านใหม่ไม่ตรงกัน" });
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" });
      return;
    }

    setMsg({ type: "ok", text: "เปลี่ยนรหัสผ่านสำเร็จ!" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    // กลับหน้าเดิมหลัง 1.5 วิ
    setTimeout(() => router.push("/teacher"), 1500);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          รหัสผ่านปัจจุบัน <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="form-input"
          placeholder="รหัสผ่านปัจจุบัน"
          required
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          รหัสผ่านใหม่ <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="form-input"
          placeholder="อย่างน้อย 6 ตัวอักษร"
          required
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="form-input"
          placeholder="ยืนยันรหัสผ่านใหม่"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <a href="/teacher" className="btn-secondary flex-1 text-center text-sm">
          ยกเลิก
        </a>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary flex-1 text-sm"
        >
          {submitting ? "กำลังบันทึก..." : "🔒 เปลี่ยนรหัสผ่าน"}
        </button>
      </div>
    </form>
  );
}
