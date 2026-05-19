import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const gracePeriod = parseInt(map["grace_period_minutes"] ?? "5");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">ตั้งค่าระบบ</h2>
        <p className="text-sm text-gray-500 mt-1">ปรับค่าพฤติกรรมของระบบ</p>
      </div>
      <SettingsForm gracePeriod={gracePeriod} />
    </div>
  );
}
