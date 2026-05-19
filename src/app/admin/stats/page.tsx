import { prisma } from "@/lib/prisma";
import Link from "next/link";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface Props {
  searchParams: { range?: string; start?: string; end?: string };
}

export default async function StatsPage({ searchParams }: Props) {
  const now = new Date();
  const range = searchParams.range ?? "week";

  // คำนวณช่วงวันที่
  let startDate: Date;
  let endDate: Date;
  let rangeLabel: string;

  if (range === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    rangeLabel = `เดือน${THAI_MONTHS[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;
  } else if (range === "custom" && searchParams.start && searchParams.end) {
    const [sy, sm, sd] = searchParams.start.split("-").map(Number);
    const [ey, em, ed] = searchParams.end.split("-").map(Number);
    startDate = new Date(sy, sm - 1, sd);
    endDate = new Date(ey, em - 1, ed + 1);
    rangeLabel = `${searchParams.start} ถึง ${searchParams.end}`;
  } else {
    // สัปดาห์นี้ (จันทร์ถึงวันนี้)
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    startDate = monday;
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    rangeLabel = "สัปดาห์นี้ (จันทร์ถึงวันนี้)";
  }

  // ดึงข้อมูล assignments ในช่วงเวลา
  const assignments = await prisma.dutyAssignment.findMany({
    where: { dutyDate: { gte: startDate, lt: endDate } },
    include: {
      user: { select: { id: true, fullName: true } },
      checkIn: { select: { status: true } },
    },
  });

  // ดึงวันหยุดในช่วงเวลา
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    select: { date: true },
  });
  const holidaySet = new Set(
    holidays.map((h) => `${h.date.getFullYear()}-${h.date.getMonth()}-${h.date.getDate()}`)
  );

  // กรองออก assignment ที่ตรงกับวันหยุด
  const filteredAssignments = assignments.filter((a) => {
    const key = `${a.dutyDate.getFullYear()}-${a.dutyDate.getMonth()}-${a.dutyDate.getDate()}`;
    return !holidaySet.has(key);
  });

  // คำนวณสถิติรายบุคคล
  type UserStat = {
    id: number; fullName: string;
    total: number; onTime: number; early: number; late: number; absent: number;
  };

  const statsMap = new Map<number, UserStat>();

  for (const a of filteredAssignments) {
    const uid = a.user.id;
    if (!statsMap.has(uid)) {
      statsMap.set(uid, { id: uid, fullName: a.user.fullName, total: 0, onTime: 0, early: 0, late: 0, absent: 0 });
    }
    const s = statsMap.get(uid)!;
    s.total++;
    if (!a.checkIn) {
      // นับเป็นขาดเฉพาะถ้าเลยเวลาเวรแล้ว
      if (a.dutyDate < now) s.absent++;
    } else if (a.checkIn.status === "EARLY") s.early++;
    else if (a.checkIn.status === "ON_TIME") s.onTime++;
    else if (a.checkIn.status === "LATE") s.late++;
  }

  // เรียงตามชื่อ
  const stats = Array.from(statsMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, "th"));

  // สรุปรวม
  const totalAll = stats.reduce((s, x) => s + x.total, 0);
  const earlyAll = stats.reduce((s, x) => s + x.early, 0);
  const onTimeAll = stats.reduce((s, x) => s + x.onTime, 0);
  const lateAll = stats.reduce((s, x) => s + x.late, 0);
  const absentAll = stats.reduce((s, x) => s + x.absent, 0);

  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const endStrParam = searchParams.end ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin" className="text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้า Admin
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">สถิติการเข้าเวร</h2>
        <p className="text-sm text-gray-500 mt-1">{rangeLabel}</p>
      </div>

      {/* เลือกช่วงเวลา */}
      <div className="card">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-gray-700 mr-1">ช่วงเวลา:</span>
          {[
            { label: "สัปดาห์นี้", value: "week" },
            { label: "เดือนนี้", value: "month" },
          ].map((r) => (
            <Link
              key={r.value}
              href={`/admin/stats?range=${r.value}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${range === r.value ? "bg-brand-orange-500 text-white border-brand-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-brand-orange-300"}`}
            >
              {r.label}
            </Link>
          ))}
          <span className="text-gray-400 text-sm">หรือเลือกช่วงเอง:</span>
          <form method="get" action="/admin/stats" className="flex items-center gap-2">
            <input type="hidden" name="range" value="custom" />
            <input
              type="date"
              name="start"
              defaultValue={startStr}
              className="form-input text-sm w-auto"
            />
            <span className="text-gray-400 text-sm">ถึง</span>
            <input
              type="date"
              name="end"
              defaultValue={endStrParam}
              className="form-input text-sm w-auto"
            />
            <button type="submit" className="btn-secondary text-sm">ดู</button>
          </form>
        </div>
      </div>

      {/* สรุปรวม */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "เวรทั้งหมด", value: totalAll, color: "bg-gray-100 text-gray-800" },
          { label: "ก่อนเวลา", value: earlyAll, color: "bg-blue-50 text-blue-800" },
          { label: "ตรงเวลา", value: onTimeAll, color: "bg-green-50 text-green-800" },
          { label: "สาย", value: lateAll, color: "bg-yellow-50 text-yellow-800" },
          { label: "ขาด", value: absentAll, color: absentAll > 0 ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-400" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ตารางสถิติรายบุคคล */}
      {stats.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อครู</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">ทั้งหมด</th>
                <th className="text-center px-4 py-3 font-semibold text-blue-600">ก่อนเวลา</th>
                <th className="text-center px-4 py-3 font-semibold text-green-700">ตรงเวลา</th>
                <th className="text-center px-4 py-3 font-semibold text-yellow-700">สาย</th>
                <th className="text-center px-4 py-3 font-semibold text-red-600">ขาด</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">% ตรงเวลา</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => {
                const pct = s.total > 0 ? Math.round(((s.onTime + s.early) / s.total) * 100) : 0;
                return (
                  <tr key={s.id} className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.fullName}</td>
                    <td className="px-4 py-3 text-center">{s.total}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{s.early}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-700">{s.onTime}</td>
                    <td className="px-4 py-3 text-center font-semibold text-yellow-700">{s.late}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">{s.absent}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
