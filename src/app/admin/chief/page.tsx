import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChiefManager } from "./chief-manager";

interface Props {
  searchParams: { date?: string };
}

export default async function AdminChiefPage({ searchParams }: Props) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateStr = searchParams.date ?? todayStr;

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  const [chiefAssignment, users] = await Promise.all([
    prisma.chiefAssignment.findFirst({
      where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
      include: { user: { select: { id: true, fullName: true } } },
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
        <h2 className="text-2xl font-bold text-gray-800 mt-2">กำหนดหัวหน้าเวร</h2>
        <p className="text-sm text-gray-500 mt-1">กำหนดหัวหน้าเวรประจำวัน (1 วันต่อ 1 คน)</p>
      </div>
      <ChiefManager
        dateStr={dateStr}
        todayStr={todayStr}
        currentChief={chiefAssignment ? { id: chiefAssignment.id, userId: chiefAssignment.userId, fullName: chiefAssignment.user.fullName } : null}
        users={users}
      />
    </div>
  );
}
