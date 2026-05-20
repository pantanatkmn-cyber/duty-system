import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/app/dashboard/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-10 w-10 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div>
              <h1 className="font-semibold text-gray-800 leading-tight text-sm">
                ระบบตรวจการเข้าเวร · Admin
              </h1>
              <p className="text-xs text-gray-500">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge badge-danger text-xs hidden sm:inline-flex">ADMIN</span>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
