"use client";

import React, { useState } from "react";

// ===== Types =====
type User = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  active: boolean;
};

type FormState = {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  confirmPassword: string;
};

// ===== ค่าคงที่ =====
const ROLE_OPTIONS = [
  { value: "TEACHER", label: "ครูเวร" },
  { value: "CHIEF", label: "หัวหน้าเวร" },
  { value: "ADMIN", label: "ผู้ดูแลระบบ" },
];

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "badge-danger",
  CHIEF: "badge-orange",
  TEACHER: "badge-info",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  CHIEF: "หัวหน้าเวร",
  TEACHER: "ครูเวร",
};

const EMPTY_FORM: FormState = {
  username: "", fullName: "", email: "", phone: "",
  role: "TEACHER", password: "", confirmPassword: "",
};

// ===== UserManager หลัก =====
export function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function setField(key: keyof FormState, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function openAdd() {
    setShowAdd(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMsg(null);
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setShowAdd(false);
    setForm({ username: u.username, fullName: u.fullName, email: u.email ?? "", phone: u.phone ?? "", role: u.role, password: "", confirmPassword: "" });
    setMsg(null);
  }

  function cancel() {
    setShowAdd(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMsg(null);
  }

  // ===== เพิ่มผู้ใช้ =====
  async function handleAdd() {
    if (!form.username.trim() || !form.fullName.trim() || !form.password) {
      setMsg({ type: "err", text: "กรุณากรอก username, ชื่อ-สกุล และรหัสผ่าน" });
      return;
    }
    if (form.password.length < 6) {
      setMsg({ type: "err", text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setMsg({ type: "err", text: "รหัสผ่านไม่ตรงกัน" });
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role,
        password: form.password,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setUsers((prev) => [data.user, ...prev]);
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setMsg({ type: "ok", text: `เพิ่มผู้ใช้ "${data.user.fullName}" สำเร็จ` });
  }

  // ===== แก้ไขผู้ใช้ =====
  async function handleEdit() {
    if (!form.fullName.trim()) {
      setMsg({ type: "err", text: "กรุณากรอกชื่อ-สกุล" });
      return;
    }
    if (form.password) {
      if (form.password.length < 6) { setMsg({ type: "err", text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }); return; }
      if (form.password !== form.confirmPassword) { setMsg({ type: "err", text: "รหัสผ่านไม่ตรงกัน" }); return; }
    }
    setSubmitting(true);
    const body: Record<string, unknown> = {
      fullName: form.fullName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
    };
    if (form.password) body.password = form.password;
    const res = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setUsers((prev) => prev.map((u) => (u.id === editingId ? data.user : u)));
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMsg({ type: "ok", text: `บันทึกข้อมูล "${data.user.fullName}" สำเร็จ` });
  }

  // ===== เปิด/ปิดใช้งาน =====
  async function toggleActive(u: User) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ type: "err", text: data.error ?? "เกิดข้อผิดพลาด" }); return; }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? data.user : x)));
    setMsg({ type: "ok", text: `${data.user.active ? "เปิดใช้งาน" : "ปิดใช้งาน"} "${data.user.fullName}" แล้ว` });
  }

  return (
    <div className="space-y-4">
      {/* Message */}
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* ฟอร์มเพิ่มผู้ใช้ */}
      {showAdd && (
        <div className="card border-brand-orange-200 bg-brand-orange-50">
          <h3 className="font-semibold text-brand-orange-700 mb-4">เพิ่มผู้ใช้ใหม่</h3>
          <UserForm form={form} setField={setField} isAdd />
          <div className="flex gap-2 mt-4">
            <button onClick={cancel} className="btn-secondary flex-1 text-sm" disabled={submitting}>ยกเลิก</button>
            <button onClick={handleAdd} className="btn-primary flex-1 text-sm" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
            </button>
          </div>
        </div>
      )}

      {/* ปุ่มเพิ่ม */}
      {!showAdd && (
        <div className="flex justify-end">
          <button onClick={openAdd} className="btn-primary text-sm">+ เพิ่มผู้ใช้ใหม่</button>
        </div>
      )}

      {/* ตารางผู้ใช้ */}
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อ-สกุล</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">สถานะ</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <React.Fragment key={u.id}>
                <tr className={`border-b border-gray-100 hover:bg-gray-50 ${!u.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.fullName}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${ROLE_BADGE[u.role]} text-xs`}>{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${u.active ? "badge-success" : "badge-danger"} text-xs`}>
                      {u.active ? "ใช้งาน" : "ปิดใช้"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(u)} className="text-xs text-brand-orange-600 hover:underline font-medium">
                        แก้ไข
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`text-xs font-medium hover:underline ${u.active ? "text-red-500" : "text-green-600"}`}
                      >
                        {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </div>
                  </td>
                </tr>

                {/* inline edit form */}
                {editingId === u.id && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 bg-brand-orange-50 border-b border-brand-orange-200">
                      <h4 className="font-semibold text-brand-orange-700 mb-4">แก้ไข: {u.fullName}</h4>
                      <UserForm form={form} setField={setField} isAdd={false} />
                      <div className="flex gap-2 mt-4">
                        <button onClick={cancel} className="btn-secondary flex-1 text-sm" disabled={submitting}>ยกเลิก</button>
                        <button onClick={handleEdit} className="btn-primary flex-1 text-sm" disabled={submitting}>
                          {submitting ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center py-10 text-gray-400">ยังไม่มีผู้ใช้ในระบบ</p>
        )}
      </div>
    </div>
  );
}

// ===== UserForm sub-component =====
function UserForm({
  form, setField, isAdd,
}: {
  form: FormState;
  setField: (k: keyof FormState, v: string) => void;
  isAdd: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {isAdd && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            className="form-input text-sm"
            placeholder="เช่น teacher6"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          ชื่อ-สกุล <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          className="form-input text-sm"
          placeholder="ชื่อ-สกุล"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          className="form-input text-sm"
          placeholder="อีเมล (ไม่บังคับ)"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร</label>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => setField("phone", e.target.value)}
          className="form-input text-sm"
          placeholder="เบอร์โทร (ไม่บังคับ)"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          value={form.role}
          onChange={(e) => setField("role", e.target.value)}
          className="form-input text-sm"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          รหัสผ่าน{" "}
          {isAdd
            ? <span className="text-red-500">*</span>
            : <span className="text-gray-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>
          }
        </label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setField("password", e.target.value)}
          className="form-input text-sm"
          placeholder={isAdd ? "อย่างน้อย 6 ตัวอักษร" : "รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)"}
        />
      </div>
      {(isAdd || form.password) && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ยืนยันรหัสผ่าน</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            className="form-input text-sm"
            placeholder="ยืนยันรหัสผ่าน"
          />
        </div>
      )}
    </div>
  );
}
