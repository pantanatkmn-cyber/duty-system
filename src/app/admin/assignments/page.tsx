import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AssignmentManager } from "./assignment-manager";

interface Props {
  searchParams: { date?: string };
}

export default async function AssignmentsPage({ searchParams }: Props) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateStr = searchParams.date ?? todayStr;

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  const [dutyTypes, assignments, users] = await Promise.all([
    prisma.dutyType.findMany({
      where: { active: true },
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
    }),
    prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
      include: { user: { select: { id: true, fullName: true } }, dutyType: true },
      orderBy: [{ dutyType: { startTime: "asc" } }, { user: { fullName: "asc" } }],
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
        <h2 className="text-2xl font-bold text-gray-800 mt-2">มอบหมายเวร</h2>
        <p className="text-sm text-gray-500 mt-1">กำหนดครูประจำเวรแต่ละวัน</p>
      </div>
      <AssignmentManager
        dateStr={dateStr}
        todayStr={todayStr}
        dutyTypes={dutyTypes}
        initialAssignments={assignments.map((a) => ({
          id: a.id,
          userId: a.userId,
          dutyTypeId: a.dutyTypeId,
          note: a.note,
          user: a.user,
          dutyType: { id: a.dutyType.id, name: a.dutyType.name, category: a.dutyType.category, startTime: a.dutyType.startTime, endTime: a.dutyType.endTime },
        }))}
        users={users}
      />
    </div>
  );
}
