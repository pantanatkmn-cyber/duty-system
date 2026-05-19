import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintControls } from "./print-controls";

// ===== ค่าคงที่ =====
const CATEGORY_LABEL: Record<string, string> = {
  FRONT_GATE: "เวรประตูหน้า",
  POINT: "เวรประจำจุด",
  PERIOD: "เวรคาบ",
};

const CATEGORY_ORDER = ["FRONT_GATE", "POINT", "PERIOD"];

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

// ===== Helpers =====
function formatThaiDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${day} ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

function getStatusText(checkIn: { status: string } | null): string {
  if (!checkIn) return "ขาด";
  if (checkIn.status === "ON_TIME") return "ตรงเวลา";
  if (checkIn.status === "LATE") return "สาย";
  return checkIn.status;
}

// ===== Page =====
interface Props {
  searchParams: { date?: string };
}

export default async function PrintPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "CHIEF") {
    redirect("/dashboard");
  }

  // กำหนดวันที่
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateStr = searchParams.date ?? todayStr;

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  // แปลง JS getDay() → dayOfWeek (1=จันทร์…5=ศุกร์)
  const jsDay = new Date(year, month - 1, day).getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // ดึงข้อมูล
  const [assignments, chiefAssignment] = await Promise.all([
    prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
      include: {
        user: { select: { fullName: true } },
        dutyType: true,
        checkIn: true,
        incidents: { include: { photos: true }, orderBy: { reportedAt: "asc" } },
      },
      orderBy: [{ dutyType: { startTime: "asc" } }, { user: { fullName: "asc" } }],
    }),
    prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  // สถิติ
  const total = assignments.length;
  const onTime = assignments.filter((a) => a.checkIn?.status === "ON_TIME").length;
  const late = assignments.filter((a) => a.checkIn?.status === "LATE").length;
  const absent = assignments.filter((a) => !a.checkIn).length;
  const totalIncidents = assignments.reduce((sum, a) => sum + a.incidents.length, 0);

  // จัดกลุ่มตามประเภท
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    items: assignments.filter((a) => a.dutyType.category === cat),
  })).filter((g) => g.items.length > 0);

  // เหตุการณ์ทั้งหมด
  const allIncidents = assignments.flatMap((a) =>
    a.incidents.map((inc) => ({
      ...inc,
      teacherName: a.user.fullName,
      dutyName: a.dutyType.name,
    }))
  );

  const thaiDate = formatThaiDate(dateStr);
  const printedAt = formatTime(now.toISOString());

  return (
    <>
      {/* ปุ่มควบคุม (ซ่อนตอนพิมพ์จริง) */}
      <PrintControls />

      {/* ใบรายงาน */}
      <div className="min-h-screen bg-white p-8 max-w-3xl mx-auto font-sans text-sm text-gray-900 print:p-6">

        {/* หัวเอกสาร */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <p className="text-base font-bold">วิทยาลัยเทคโนโลยีสันตพล</p>
          <p className="text-xl font-bold mt-1">ใบรายงานสรุปการเข้าเวรประจำวัน</p>
          <p className="mt-1">{thaiDate}</p>
        </div>

        {/* ข้อมูลหัวหน้าเวร + วันพิมพ์ */}
        <div className="flex justify-between mb-5 text-sm">
          <div>
            <span className="font-semibold">หัวหน้าเวรประจำวัน: </span>
            <span className="underline underline-offset-2">
              {chiefAssignment?.user.fullName ?? "ยังไม่ได้กำหนด"}
            </span>
          </div>
          <div className="text-gray-500 text-xs">
            พิมพ์เมื่อ {printedAt}
          </div>
        </div>

        {/* ตารางสรุปสถิติ */}
        <div className="mb-5">
          <table className="w-full border border-gray-300 text-center text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2">เวรทั้งหมด</th>
                <th className="border border-gray-300 px-3 py-2">ตรงเวลา</th>
                <th className="border border-gray-300 px-3 py-2">สาย</th>
                <th className="border border-gray-300 px-3 py-2">ขาด</th>
                <th className="border border-gray-300 px-3 py-2">เหตุการณ์ผิดปกติ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2 font-bold text-base">{total}</td>
                <td className="border border-gray-300 px-3 py-2 font-bold text-base text-green-700">{onTime}</td>
                <td className="border border-gray-300 px-3 py-2 font-bold text-base text-yellow-700">{late}</td>
                <td className="border border-gray-300 px-3 py-2 font-bold text-base text-red-700">{absent}</td>
                <td className="border border-gray-300 px-3 py-2 font-bold text-base">{totalIncidents}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* รายละเอียดเวรแยกตามประเภท */}
        {grouped.map((group, gi) => (
          <div key={group.category} className={gi > 0 ? "mt-5" : ""}>
            <p className="font-bold bg-gray-100 border border-gray-300 px-3 py-1.5 mb-0">
              {group.label}
            </p>
            <table className="w-full border border-gray-300 border-t-0 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-300 px-3 py-1.5 text-left">ชื่อครู</th>
                  <th className="border-b border-r border-gray-300 px-3 py-1.5 text-left">เวร</th>
                  <th className="border-b border-r border-gray-300 px-3 py-1.5 text-center w-24">เวลาเช็กอิน</th>
                  <th className="border-b border-r border-gray-300 px-3 py-1.5 text-center w-24">สถานะ</th>
                  <th className="border-b border-gray-300 px-3 py-1.5 text-center w-20">เหตุการณ์</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                    <td className="border-b border-r border-gray-300 px-3 py-1.5">{a.user.fullName}</td>
                    <td className="border-b border-r border-gray-300 px-3 py-1.5 text-gray-600">
                      {a.dutyType.name}
                      <span className="text-xs ml-1 text-gray-400">
                        ({a.dutyType.startTime}–{a.dutyType.endTime})
                      </span>
                    </td>
                    <td className="border-b border-r border-gray-300 px-3 py-1.5 text-center">
                      {a.checkIn ? formatTime(a.checkIn.checkInTime.toISOString()) : "—"}
                    </td>
                    <td className="border-b border-r border-gray-300 px-3 py-1.5 text-center font-semibold">
                      <span className={
                        !a.checkIn ? "text-red-700" :
                        a.checkIn.status === "ON_TIME" ? "text-green-700" : "text-yellow-700"
                      }>
                        {getStatusText(a.checkIn)}
                      </span>
                    </td>
                    <td className="border-b border-gray-300 px-3 py-1.5 text-center">
                      {a.incidents.length > 0 ? (
                        <span className="font-semibold text-yellow-700">{a.incidents.length} รายการ</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* เหตุการณ์ผิดปกติ */}
        {allIncidents.length > 0 && (
          <div className="mt-6">
            <p className="font-bold text-base mb-2">รายการเหตุการณ์ผิดปกติ ({allIncidents.length} รายการ)</p>
            <table className="w-full border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-1.5 text-left w-8">#</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left">ครูผู้รายงาน</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left">ประเภทเหตุการณ์</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left">รายละเอียด</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-center w-20">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {allIncidents.map((inc, i) => (
                  <tr key={inc.id} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                    <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-500">{i + 1}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{inc.teacherName}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{inc.incidentType}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-600">
                      {inc.description || "—"}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">
                      {formatTime(inc.reportedAt.toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ช่องลายเซ็น */}
        <div className="mt-12 grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="border-b border-gray-800 mb-2 h-12" />
            <p className="font-semibold">
              {chiefAssignment?.user.fullName ?? "(หัวหน้าเวรประจำวัน)"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">หัวหน้าเวรประจำวัน</p>
          </div>
          <div className="text-center">
            <div className="border-b border-gray-800 mb-2 h-12" />
            <p className="font-semibold">(............................................)</p>
            <p className="text-xs text-gray-500 mt-0.5">ผู้บริหารรับทราบ</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          ระบบตรวจการเข้าเวร · วิทยาลัยเทคโนโลยีสันตพล · พิมพ์เมื่อ {printedAt}
        </div>
      </div>

      {/* CSS สำหรับพิมพ์ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body { font-family: 'Sarabun', Arial, sans-serif; }
        }
      `}</style>
    </>
  );
}
