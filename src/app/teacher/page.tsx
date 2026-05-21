import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { Clock } from "./clock";
import { DutyList, type Assignment } from "./duty-list";
import Link from "next/link";

export default async function TeacherPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = parseInt(session.user.id);

  // ดึงเวรของวันนี้
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const assignments = await prisma.dutyAssignment.findMany({
    where: {
      userId,
      dutyDate: { gte: todayStart, lt: tomorrowStart },
    },
    include: { dutyType: true, checkIn: true },
    orderBy: [{ dutyType: { startTime: "asc" } }],
  });

  // สถิติสรุปเร็ว
  const checkedCount = assignments.filter((a) => !!a.checkIn).length;
  const totalCount = assignments.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-10 w-10 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div>
              <h1 className="font-semibold text-gray-800 leading-tight text-sm">
                ระบบตรวจการเข้าเวร
              </h1>
              <p className="text-xs text-gray-500">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{session.user.name}</p>
              <span className="badge badge-info">ครูเวร</span>
            </div>
            <Link
              href="/dashboard"
              className="btn-secondary text-sm"
              title="กลับหน้าแรก"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">หน้าแรก</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* นาฬิกา */}
        <Clock />

        {/* ยินดีต้อนรับ */}
        <div className="card !py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">สวัสดี, {session.user.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalCount === 0
                ? "ไม่มีเวรวันนี้"
                : `เวรวันนี้ ${checkedCount}/${totalCount} รายการ เช็กอินแล้ว`}
            </p>
            <Link href="/teacher/profile" className="text-xs text-brand-orange-600 hover:underline mt-1 inline-block">
              🔒 เปลี่ยนรหัสผ่าน
            </Link>
          </div>
          {totalCount > 0 && (
            <div className="text-right">
              <span
                className={`text-2xl font-bold ${
                  checkedCount === totalCount ? "text-green-600" : "text-brand-orange-500"
                }`}
              >
                {checkedCount}/{totalCount}
              </span>
            </div>
          )}
        </div>

        {/* รายการเวร */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            เวรของฉันวันนี้
          </h2>
          <DutyList
            assignments={assignments as unknown as Assignment[]}
            userName={session.user.name ?? session.user.username}
          />
        </div>
      </main>
    </div>
  );
}
