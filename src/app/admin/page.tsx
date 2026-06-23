import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [userCount, assignmentCount, incidentCount, chiefToday] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.dutyAssignment.count({
      where: { dutyDate: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.incidentReport.count({
      where: { assignment: { dutyDate: { gte: todayStart, lt: tomorrowStart } } },
    }),
    prisma.chiefAssignment.findFirst({
      where: { dutyDate: { gte: todayStart, lt: tomorrowStart } },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const sections = [
    {
      href: "/admin/users",
      icon: "👥",
      title: "จัดการผู้ใช้",
      desc: "เพิ่ม แก้ไข ปิดใช้งาน และรีเซ็ตรหัสผ่านผู้ใช้",
      badge: `${userCount} คน (active)`,
    },
    {
      href: "/admin/assignments",
      icon: "📋",
      title: "มอบหมายเวร",
      desc: "กำหนดเวรให้ครูแต่ละวัน เพิ่ม/ลบ assignment",
      badge: `วันนี้ ${assignmentCount} เวร`,
    },
    {
      href: "/admin/chief",
      icon: "⭐",
      title: "กำหนดหัวหน้าเวร",
      desc: "กำหนดหัวหน้าเวรประจำวัน",
      badge: chiefToday ? chiefToday.user.fullName : "ยังไม่ได้กำหนดวันนี้",
    },
    {
      href: "/admin/settings",
      icon: "⚙️",
      title: "ตั้งค่าระบบ",
      desc: "กำหนดนาทีผ่อนผันก่อนนับเป็นสาย (grace period)",
      badge: null,
    },
    {
      href: "/admin/stats",
      icon: "📊",
      title: "สถิติการเข้าเวร",
      desc: "ดูสถิติรายบุคคล รายสัปดาห์ และรายเดือน",
      badge: incidentCount > 0 ? `${incidentCount} เหตุการณ์วันนี้` : "ไม่มีเหตุการณ์วันนี้",
    },
    {
      href: "/admin/holidays",
      icon: "🎌",
      title: "จัดการวันหยุด",
      desc: "กำหนดวันหยุด เวรในวันนั้นเป็นโมฆะ ไม่นับสถิติ",
      badge: null,
    },
    {
      href: "/admin/reports",
      icon: "🖨️",
      title: "รายงานย้อนหลัง",
      desc: "เลือกวันที่เพื่อดูและพิมพ์รายงานเวรย้อนหลัง",
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้าหลัก
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">หน้าผู้ดูแลระบบ</h2>
        <p className="text-sm text-gray-500 mt-1">จัดการระบบเวรประจำวันทั้งหมด</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card hover:border-brand-orange-300 hover:shadow-md transition group cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 group-hover:text-brand-orange-700">
                  {s.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
                {s.badge && (
                  <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {s.badge}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
