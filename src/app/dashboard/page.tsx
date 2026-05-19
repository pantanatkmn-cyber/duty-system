import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  const roleLabel = {
    ADMIN: "ผู้ดูแลระบบ",
    CHIEF: "หัวหน้าเวร",
    TEACHER: "ครูเวร",
  }[role];

  const roleBadgeColor = {
    ADMIN: "badge-danger",
    CHIEF: "badge-orange",
    TEACHER: "badge-info",
  }[role];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-orange-500 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-gray-800 leading-tight">
                ระบบตรวจการเข้าเวร
              </h1>
              <p className="text-xs text-gray-500">
                วิทยาลัยเทคโนโลยีสันตพล
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">
                {session.user.name}
              </p>
              <span className={`badge ${roleBadgeColor}`}>{roleLabel}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome card */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            สวัสดี, {session.user.name} 👋
          </h2>
          <p className="text-gray-600">
            ยินดีต้อนรับเข้าสู่ระบบตรวจการเข้าเวร
          </p>
        </div>

        {/* Phase 1 placeholder */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-brand-orange-100 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-brand-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">
                Phase 1: ระบบยืนยันตัวตน
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                ตอนนี้ระบบ login + ตรวจสิทธิ์ role ทำงานเรียบร้อยแล้ว
                หน้านี้เป็น placeholder รอเฟสถัดไปครับ
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  ข้อมูล session ของคุณ:
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>
                    <span className="text-gray-500">ID:</span>{" "}
                    {session.user.id}
                  </li>
                  <li>
                    <span className="text-gray-500">ชื่อผู้ใช้:</span>{" "}
                    {session.user.username}
                  </li>
                  <li>
                    <span className="text-gray-500">ชื่อ:</span>{" "}
                    {session.user.name}
                  </li>
                  <li>
                    <span className="text-gray-500">บทบาท:</span>{" "}
                    <span className={`badge ${roleBadgeColor}`}>
                      {roleLabel}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Links ตาม role */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {role === "ADMIN" && (
            <Link href="/admin" className="card hover:border-brand-orange-300 hover:shadow-md transition cursor-pointer">
              <h4 className="font-semibold text-gray-800">หน้า Admin</h4>
              <p className="text-sm text-gray-500 mt-1">
                จัดการผู้ใช้และมอบหมายเวร
              </p>
            </Link>
          )}
          {(role === "ADMIN" || role === "CHIEF") && (
            <Link href="/chief" className="card hover:border-brand-orange-300 hover:shadow-md transition cursor-pointer">
              <h4 className="font-semibold text-gray-800">หน้าหัวหน้าเวร</h4>
              <p className="text-sm text-gray-500 mt-1">
                ดูสรุปรายงานเวรประจำวัน
              </p>
            </Link>
          )}
          <Link href="/teacher" className="card hover:border-brand-orange-300 hover:shadow-md transition cursor-pointer">
            <h4 className="font-semibold text-gray-800">เวรของฉัน</h4>
            <p className="text-sm text-gray-500 mt-1">
              เช็กอินและดูเวรประจำวัน
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
