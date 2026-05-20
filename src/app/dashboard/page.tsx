import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

// ไอคอน SVG แต่ละเมนู
function IconShield() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// วันที่ภาษาไทย
function getThaiDate() {
  const now = new Date();
  const thaiDays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  return `วัน${thaiDays[now.getDay()]}ที่ ${now.getDate()} ${thaiMonths[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;

  // ตรวจว่าครูคนนี้เป็นหัวหน้าเวรของวันนี้หรือไม่
  let isWeeklyChiefToday = false;
  if (role === "TEACHER") {
    const now = new Date();
    const jsDay = now.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const chiefRecord = await prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek },
    });
    isWeeklyChiefToday = chiefRecord?.userId === Number(session.user.id);
  }

  const roleLabel: Record<string, string> = {
    ADMIN: "ผู้ดูแลระบบ",
    CHIEF: "หัวหน้าเวร",
    TEACHER: "ครูเวร",
  };

  const roleBadgeColor: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    CHIEF: "bg-brand-orange-100 text-brand-orange-700",
    TEACHER: "bg-blue-100 text-blue-700",
  };

  // เมนูที่แสดงตาม role
  const menuItems = [
    ...(role === "ADMIN" ? [{
      href: "/admin",
      icon: <IconShield />,
      title: "จัดการระบบ",
      desc: "จัดการผู้ใช้ มอบหมายเวร กำหนดหัวหน้าเวร และตั้งค่าระบบ",
      color: "from-red-500 to-red-600",
      hoverBorder: "hover:border-red-300",
    }] : []),
    ...((role === "ADMIN" || role === "CHIEF" || isWeeklyChiefToday) ? [{
      href: "/chief",
      icon: <IconClipboard />,
      title: "รายงานประจำวัน",
      desc: "ดูสรุปสถานะเวรทั้งหมด เหตุการณ์ผิดปกติ และพิมพ์ใบรายงาน",
      color: "from-brand-orange-500 to-brand-orange-600",
      hoverBorder: "hover:border-brand-orange-300",
    }] : []),
    {
      href: "/teacher",
      icon: <IconUser />,
      title: "เวรของฉัน",
      desc: "ดูตารางเวร เช็กอินด้วยกล้องสด และรายงานเหตุการณ์",
      color: "from-blue-500 to-blue-600",
      hoverBorder: "hover:border-blue-300",
    },
  ];

  const thaiDate = getThaiDate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-9 w-9 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div className="leading-tight">
              <p className="font-semibold text-gray-800 text-sm">ระบบตรวจการเข้าเวร</p>
              <p className="text-xs text-gray-400">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800 leading-tight">{session.user.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColor[role]}`}>
                {roleLabel[role]}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">
        {/* Welcome section */}
        <div className="mb-8">
          <p className="text-xs text-gray-400 mb-1">{thaiDate}</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            สวัสดี, {session.user.name}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadgeColor[role]}`}>
              {roleLabel[role]}
            </span>
            <span className="text-sm text-gray-500">ยินดีต้อนรับเข้าสู่ระบบ</span>
          </div>
        </div>

        {/* เมนูหลัก */}
        <div className={`grid gap-4 ${menuItems.length === 1 ? "grid-cols-1 max-w-sm" : menuItems.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 ${item.hoverBorder} hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              {/* ไอคอน */}
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white`}>
                {item.icon}
              </div>
              {/* ข้อความ */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-base mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
              {/* ลูกศร */}
              <div className="flex justify-end">
                <IconChevron />
              </div>
            </Link>
          ))}
        </div>

        {/* ลิงก์โปรไฟล์ */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/teacher/profile"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            ตั้งค่าโปรไฟล์ / เปลี่ยนรหัสผ่าน
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-300">
        © 2026 วิทยาลัยเทคโนโลยีสันตพล
      </footer>
    </div>
  );
}
