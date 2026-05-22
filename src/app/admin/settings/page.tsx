import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import type { AllSettings } from "./settings-form";

// ค่า default ถ้ายังไม่มีใน DB
const DEFAULTS: AllSettings = {
  front_gate_grace_minutes: 0,
  front_gate_checkout_time: "08:20",
  front_gate_forgot_time: "17:30",
  point_grace_minutes: 0,
  point_checkout_time: "16:30",
  point_forgot_time: "17:30",
  period_grace_minutes: 5,
};

export default async function SettingsPage() {
  const rows = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  // รวมค่า default กับค่าใน DB
  const settings: AllSettings = {
    front_gate_grace_minutes: parseInt(map["front_gate_grace_minutes"] ?? map["grace_period_minutes"] ?? String(DEFAULTS.front_gate_grace_minutes)),
    front_gate_checkout_time: map["front_gate_checkout_time"] ?? DEFAULTS.front_gate_checkout_time,
    front_gate_forgot_time:   map["front_gate_forgot_time"] ?? map["school_forgot_checkout_time"] ?? DEFAULTS.front_gate_forgot_time,
    point_grace_minutes:      parseInt(map["point_grace_minutes"] ?? String(DEFAULTS.point_grace_minutes)),
    point_checkout_time:      map["point_checkout_time"] ?? map["school_end_time"] ?? DEFAULTS.point_checkout_time,
    point_forgot_time:        map["point_forgot_time"] ?? map["school_forgot_checkout_time"] ?? DEFAULTS.point_forgot_time,
    period_grace_minutes:     parseInt(map["period_grace_minutes"] ?? map["grace_period_minutes"] ?? String(DEFAULTS.period_grace_minutes)),
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">ตั้งค่าระบบ</h2>
        <p className="text-sm text-gray-500 mt-1">ตั้งเวลาเข้า-ออกเวร และผ่อนผันแต่ละประเภทเวร</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
