import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { WeeklyChiefManager } from "./chief-manager";

export default async function AdminChiefPage() {
  const [weeklyAssignments, users] = await Promise.all([
    prisma.weeklyChiefAssignment.findMany({
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">กำหนดหัวหน้าเวรประจำสัปดาห์</h2>
        <p className="text-sm text-gray-500 mt-1">
          กำหนดหัวหน้าเวรแต่ละวัน — มีผลกับทุกสัปดาห์ตลอดไป
        </p>
      </div>
      <WeeklyChiefManager
        initialAssignments={weeklyAssignments.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          userId: a.userId,
          fullName: a.user.fullName,
        }))}
        users={users}
      />
    </div>
  );
}
