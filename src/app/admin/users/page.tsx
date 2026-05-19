import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserManager } from "./user-manager";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, fullName: true, email: true,
      phone: true, role: true, active: true, createdAt: true,
    },
    orderBy: [{ active: "desc" }, { role: "asc" }, { fullName: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">จัดการผู้ใช้</h2>
        <p className="text-sm text-gray-500 mt-1">
          ผู้ใช้ทั้งหมด {users.length} คน · active {users.filter((u) => u.active).length} คน
        </p>
      </div>
      <UserManager initialUsers={users} />
    </div>
  );
}
