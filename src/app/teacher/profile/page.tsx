import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/app/dashboard/logout-button";
import Link from "next/link";
import { PasswordForm } from "./password-form";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  CHIEF: "หัวหน้าเวร",
  TEACHER: "ครูเวร",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-10 w-10 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div>
              <h1 className="font-semibold text-gray-800 leading-tight text-sm">ระบบตรวจการเข้าเวร</h1>
              <p className="text-xs text-gray-500">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Link href="/teacher" className="inline-flex items-center gap-1 text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้ารายการเวร
        </Link>

        {/* ข้อมูลบัญชี */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ข้อมูลบัญชีของฉัน</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 w-24 shrink-0">ชื่อ-สกุล</span>
              <span className="font-semibold text-gray-800">{session.user.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 w-24 shrink-0">Username</span>
              <span className="font-mono text-gray-700">{session.user.username}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500 w-24 shrink-0">บทบาท</span>
              <span className="badge badge-info text-xs">{ROLE_LABEL[session.user.role] ?? session.user.role}</span>
            </div>
          </div>
        </div>

        {/* เปลี่ยนรหัสผ่าน */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 เปลี่ยนรหัสผ่าน</h2>
          <PasswordForm />
        </div>
      </main>
    </div>
  );
}
