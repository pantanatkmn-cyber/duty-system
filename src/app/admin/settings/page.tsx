import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import type { AllSettings } from "./settings-form";
import { DutyTimesForm } from "./duty-times-form";

const DEFAULTS: AllSettings = {
  front_gate_grace_minutes: 0,
  front_gate_checkout_time: "08:20",
  front_gate_forgot_time: "17:30",
  point_grace_minutes: 0,
  point_checkout_time: "16:30",
  point_forgot_time: "17:30",
  period_grace_minutes: 5,
  period_forgot_time: "17:30",
};

export default async function SettingsPage() {
  const [rows, dutyTypes] = await Promise.all([
    prisma.systemSetting.findMany(),
    prisma.dutyType.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { startTime: "asc" }],
      select: { id: true, name: true, category: true, startTime: true, endTime: true },
    }),
  ]);

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const settings: AllSettings = {
    front_gate_grace_minutes: parseInt(map["front_gate_grace_minutes"] ?? map["grace_period_minutes"] ?? String(DEFAULTS.front_gate_grace_minutes)),
    front_gate_checkout_time: map["front_gate_checkout_time"] ?? DEFAULTS.front_gate_checkout_time,
    front_gate_forgot_time:   map["front_gate_forgot_time"] ?? map["school_forgot_checkout_time"] ?? DEFAULTS.front_gate_forgot_time,
    point_grace_minutes:      parseInt(map["point_grace_minutes"] ?? String(DEFAULTS.point_grace_minutes)),
    point_checkout_time:      map["point_checkout_time"] ?? map["school_end_time"] ?? DEFAULTS.point_checkout_time,
    point_forgot_time:        map["point_forgot_time"] ?? map["school_forgot_checkout_time"] ?? DEFAULTS.point_forgot_time,
    period_grace_minutes:     parseInt(map["period_grace_minutes"] ?? map["grace_period_minutes"] ?? String(DEFAULTS.period_grace_minutes)),
    period_forgot_time:       map["period_forgot_time"] ?? DEFAULTS.period_forgot_time,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">ตั้งค่าระบบ</h2>
        <p className="text-sm text-gray-500 mt-1">จัดการเวลาและกฎการเข้า-ออกเวร</p>
      </div>

      {/* ─── ส่วนที่ 1: กฎเข้า-ออกเวร ─── */}
      <div>
        <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>⚙️</span> กฎการเข้าและออกเวร
        </h3>
        <SettingsForm settings={settings} />
      </div>

      <div className="border-t border-gray-200 pt-6">
        {/* ─── ส่วนที่ 2: เวลาของเวรแต่ละชนิด ─── */}
        <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>🕐</span> เวลาเริ่ม-สิ้นสุด ของเวรแต่ละชนิด
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          เวลาเริ่มใช้เปรียบเทียบกับเวลาเช็กอิน · เวลาสิ้นสุดใช้สำหรับเวรคาบและเวรประตูหน้า
        </p>
        <DutyTimesForm dutyTypes={dutyTypes} />
      </div>
    </div>
  );
}
