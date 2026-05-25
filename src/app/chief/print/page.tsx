import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintControls } from "./print-controls";
import { formatThaiTime } from "@/lib/thai-time";
import { INSPECTION_POINTS } from "@/lib/inspection-points";

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


// แสดงช่วงเวลาเวรที่ "เป็นทางการ" ตามประเภท
// FRONT_GATE และ POINT อยู่เวรตลอด 07:30–16:30
// PERIOD ใช้เวลาจริงของคาบ
function getDisplayTime(category: string, startTime: string, endTime: string): string {
  if (category === "FRONT_GATE" || category === "POINT") return "07:30–16:30";
  return `${startTime}–${endTime}`;
}

function getCheckInStatus(status: string | null | undefined): { text: string; color: string } {
  if (!status) return { text: "ขาด", color: "#b91c1c" };
  if (status === "ON_TIME") return { text: "ตรงเวลา", color: "#15803d" };
  if (status === "EARLY")   return { text: "ก่อนเวลา", color: "#1d4ed8" };
  if (status === "LATE")    return { text: "สาย", color: "#b45309" };
  return { text: status, color: "#374151" };
}

function getCheckOutStatus(status: string | null | undefined): { text: string; color: string } {
  if (!status) return { text: "—", color: "#9ca3af" };
  if (status === "ON_TIME_OUT")  return { text: "ตรงเวลา", color: "#15803d" };
  if (status === "EARLY_OUT")    return { text: "ออกก่อน", color: "#b45309" };
  if (status === "LATE_OUT")     return { text: "ออกหลัง", color: "#1d4ed8" };
  return { text: status, color: "#374151" };
}

// ===== Page =====
interface Props {
  searchParams: { date?: string };
}

export default async function PrintPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // ตรวจสิทธิ์: ADMIN/CHIEF เข้าได้เลย, TEACHER ต้องเป็นหัวหน้าเวรวันนี้
  if (session.user.role !== "ADMIN" && session.user.role !== "CHIEF") {
    const now2 = new Date();
    const jsDay2 = now2.getDay();
    const todayDow = jsDay2 === 0 ? 7 : jsDay2;
    const myChief = await prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek: todayDow },
    });
    if (myChief?.userId !== Number(session.user.id)) redirect("/dashboard");
  }

  // กำหนดวันที่
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateStr = searchParams.date ?? todayStr;

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  const jsDay = new Date(year, month - 1, day).getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  // ดึงข้อมูล
  const [assignments, chiefAssignment, inspection] = await Promise.all([
    prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
      include: {
        user: { select: { fullName: true } },
        dutyType: true,
        checkIn: true,
        incidents: { orderBy: { reportedAt: "asc" } },
      },
      orderBy: [{ dutyType: { startTime: "asc" } }, { user: { fullName: "asc" } }],
    }),
    prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek },
      include: { user: { select: { fullName: true } } },
    }),
    // ดึงผลตรวจจุดของวันนั้น
    prisma.chiefInspection.findUnique({
      where: { inspectedDate: dateStr },
      include: {
        results: true,
        submittedBy: { select: { fullName: true } },
      },
    }),
  ]);

  // สถิติ (นับ EARLY รวมกับ ON_TIME = มาตรงเวลา)
  const total = assignments.length;
  const onTime = assignments.filter((a) => a.checkIn?.status === "ON_TIME" || a.checkIn?.status === "EARLY").length;
  const late = assignments.filter((a) => a.checkIn?.status === "LATE").length;
  const absent = assignments.filter((a) => !a.checkIn).length;
  const totalIncidents = assignments.reduce((sum, a) => sum + a.incidents.length, 0);

  // จัดกลุ่มตามประเภท
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    items: assignments.filter((a) => a.dutyType.category === cat),
  })).filter((g) => g.items.length > 0);

  // เหตุการณ์ผิดปกติทั้งหมด
  const allIncidents = assignments.flatMap((a) =>
    a.incidents.map((inc) => ({
      ...inc,
      teacherName: a.user.fullName,
      dutyName: a.dutyType.name,
    }))
  );

  // หมายเหตุจากครู (เฉพาะที่มีข้อมูล)
  const teacherNotes = assignments.filter((a) => !!a.teacherNote).map((a) => ({
    teacherName: a.user.fullName,
    dutyName: a.dutyType.name,
    note: a.teacherNote!,
  }));

  const thaiDate = formatThaiDate(dateStr);
  const printedAt = formatThaiTime(now.toISOString());

  return (
    <>
      <PrintControls />

      <div className="bg-white max-w-4xl mx-auto font-sans text-gray-900 p-8 print:p-0">

        {/* ===== หน้า 1: หัวเอกสาร + ตารางเวร ===== */}
        <div>
          {/* หัวเอกสาร */}
          <div className="text-center mb-5 border-b-2 border-gray-800 pb-4">
            <p className="text-base font-bold">วิทยาลัยเทคโนโลยีสันตพล</p>
            <p className="text-xl font-bold mt-1">ใบรายงานสรุปการเข้าเวรประจำวัน</p>
            <p className="mt-1 text-sm">{thaiDate}</p>
          </div>

          {/* หัวหน้าเวร + เวลาพิมพ์ */}
          <div className="flex justify-between mb-4 text-sm">
            <div>
              <span className="font-semibold">หัวหน้าเวรประจำวัน: </span>
              <span className="underline underline-offset-2">
                {chiefAssignment?.user.fullName ?? "ยังไม่ได้กำหนด"}
              </span>
            </div>
            <div className="text-gray-500 text-xs">พิมพ์เมื่อ {printedAt}</div>
          </div>

          {/* ตารางสรุปสถิติ */}
          <div className="mb-5">
            <table className="w-full border border-gray-300 text-center text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1.5">เวรทั้งหมด</th>
                  <th className="border border-gray-300 px-2 py-1.5">ตรงเวลา / ก่อนเวลา</th>
                  <th className="border border-gray-300 px-2 py-1.5">มาสาย</th>
                  <th className="border border-gray-300 px-2 py-1.5">ขาด / ยังไม่เช็กอิน</th>
                  <th className="border border-gray-300 px-2 py-1.5">เหตุการณ์ผิดปกติ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1.5 font-bold text-base">{total}</td>
                  <td className="border border-gray-300 px-2 py-1.5 font-bold text-base" style={{ color: "#15803d" }}>{onTime}</td>
                  <td className="border border-gray-300 px-2 py-1.5 font-bold text-base" style={{ color: "#b45309" }}>{late}</td>
                  <td className="border border-gray-300 px-2 py-1.5 font-bold text-base" style={{ color: "#b91c1c" }}>{absent}</td>
                  <td className="border border-gray-300 px-2 py-1.5 font-bold text-base">{totalIncidents}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* รายละเอียดเวรแยกตามประเภท */}
          {grouped.map((group, gi) => (
            <div key={group.category} style={{ breakInside: "avoid", marginTop: gi > 0 ? "1rem" : 0 }}>
              <p className="font-bold bg-gray-100 border border-gray-300 px-3 py-1.5 text-sm">
                {group.label}
              </p>
              <table className="w-full border border-gray-300 border-t-0" style={{ fontSize: "0.72rem" }}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border-b border-r border-gray-300 px-2 py-1 text-left">ชื่อครู</th>
                    <th className="border-b border-r border-gray-300 px-2 py-1 text-left">เวร</th>
                    <th className="border-b border-r border-gray-300 px-2 py-1 text-center w-16">เข้าเวร</th>
                    <th className="border-b border-r border-gray-300 px-2 py-1 text-center w-16">สถานะเข้า</th>
                    <th className="border-b border-r border-gray-300 px-2 py-1 text-center w-16">ออกเวร</th>
                    <th className="border-b border-r border-gray-300 px-2 py-1 text-center w-16">สถานะออก</th>
                    <th className="border-b border-gray-300 px-2 py-1 text-center w-14">เหตุการณ์</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((a, i) => {
                    const ciStatus = getCheckInStatus(a.checkIn?.status);
                    const coStatus = getCheckOutStatus(a.checkIn?.checkOutStatus);
                    return (
                      <tr key={a.id} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                        <td className="border-b border-r border-gray-300 px-2 py-1">{a.user.fullName}</td>
                        <td className="border-b border-r border-gray-300 px-2 py-1 text-gray-600">
                          {a.dutyType.name}
                          <span className="text-gray-400 ml-1">({getDisplayTime(a.dutyType.category, a.dutyType.startTime, a.dutyType.endTime)})</span>
                        </td>
                        <td className="border-b border-r border-gray-300 px-2 py-1 text-center">
                          {a.checkIn ? formatThaiTime(a.checkIn.checkInTime.toISOString()) : "—"}
                        </td>
                                        <td className="border-b border-r border-gray-300 px-2 py-1 text-center font-semibold" style={{ color: ciStatus.color }}>
                          {ciStatus.text}
                        </td>
                        <td className="border-b border-r border-gray-300 px-2 py-1 text-center">
                          {a.checkIn?.checkOutTime ? formatThaiTime(a.checkIn.checkOutTime.toISOString()) : "—"}
                        </td>
                        <td className="border-b border-r border-gray-300 px-2 py-1 text-center font-semibold" style={{ color: coStatus.color }}>
                          {coStatus.text}
                        </td>
                        <td className="border-b border-gray-300 px-2 py-1 text-center">
                          {a.incidents.length > 0 ? (
                            <span style={{ color: "#b45309", fontWeight: 600 }}>{a.incidents.length} รายการ</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* ===== หน้า 2 (ถ้ามีข้อมูล): เหตุการณ์ + หมายเหตุ + ลายเซ็น ===== */}
        <div style={{ breakBefore: (allIncidents.length > 0 || teacherNotes.length > 0) ? "page" : "auto" }}>

          {/* เหตุการณ์ผิดปกติ */}
          {allIncidents.length > 0 && (
            <div style={{ breakInside: "avoid" }}>
              {/* ถ้าอยู่หน้า 2 ให้มีหัวเอกสารซ้ำ */}
              {(allIncidents.length > 0 || teacherNotes.length > 0) && (
                <div className="text-center mb-4 pb-3 border-b border-gray-300">
                  <p className="font-bold text-sm">วิทยาลัยเทคโนโลยีสันตพล — ใบรายงานสรุปการเข้าเวรประจำวัน (ต่อ)</p>
                  <p className="text-xs text-gray-500">{thaiDate}</p>
                </div>
              )}
              <p className="font-bold text-sm mb-2">รายการเหตุการณ์ผิดปกติ ({allIncidents.length} รายการ)</p>
              <table className="w-full border border-gray-300" style={{ fontSize: "0.72rem" }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left w-6">#</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">ครูผู้รายงาน</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">ประเภทเหตุการณ์</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">รายละเอียด</th>
                    <th className="border border-gray-300 px-2 py-1 text-center w-16">เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {allIncidents.map((inc, i) => (
                    <tr key={inc.id} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                      <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{i + 1}</td>
                      <td className="border border-gray-300 px-2 py-1">{inc.teacherName}</td>
                      <td className="border border-gray-300 px-2 py-1">{inc.incidentType}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">{inc.description || "—"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{formatThaiTime(inc.reportedAt.toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* หมายเหตุจากครู */}
          {teacherNotes.length > 0 && (
            <div style={{ breakInside: "avoid", marginTop: "1rem" }}>
              <p className="font-bold text-sm mb-2">หมายเหตุจากครูเวร ({teacherNotes.length} รายการ)</p>
              <table className="w-full border border-gray-300" style={{ fontSize: "0.72rem" }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left w-6">#</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">ชื่อครู</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">เวร</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherNotes.map((tn, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                      <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{i + 1}</td>
                      <td className="border border-gray-300 px-2 py-1">{tn.teacherName}</td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">{tn.dutyName}</td>
                      <td className="border border-gray-300 px-2 py-1">{tn.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== ตารางตรวจจุดสำคัญประจำวัน ===== */}
          <div style={{ breakInside: "avoid", marginTop: "1rem" }}>
            <p className="font-bold text-sm mb-1 flex items-center gap-2">
              การตรวจจุดสำคัญประจำวัน
              {inspection?.submittedAt && (
                <span className="font-normal text-gray-500 text-xs">
                  (บันทึกเมื่อ {formatThaiTime(inspection.submittedAt.toISOString())}
                  {inspection.submittedBy ? ` โดย ${inspection.submittedBy.fullName}` : ""})
                </span>
              )}
            </p>
            <table className="w-full border border-gray-300" style={{ fontSize: "0.72rem" }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-left w-6">#</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">จุดตรวจ</th>
                  <th className="border border-gray-300 px-2 py-1 text-center w-20">ผลตรวจ</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {INSPECTION_POINTS.map((pt, i) => {
                  const result = inspection?.results.find((r) => r.pointCode === pt.code);
                  const isClean = result?.status === "CLEAN";
                  const isDirty = result?.status === "DIRTY";
                  return (
                    <tr key={pt.code} className={i % 2 === 1 ? "bg-gray-50" : ""}>
                      <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{i + 1}</td>
                      <td className="border border-gray-300 px-2 py-1">{pt.name}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center font-semibold"
                        style={{ color: isClean ? "#15803d" : isDirty ? "#b91c1c" : "#9ca3af" }}>
                        {isClean ? "สะอาด ✓" : isDirty ? "สกปรก ✗" : "—"}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-gray-600">
                        {result?.note || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ลายเซ็น */}
          <div className="mt-10 grid grid-cols-2 gap-12" style={{ breakInside: "avoid" }}>
            <div className="text-center">
              <div className="border-b border-gray-800 mb-2 h-12" />
              <p className="font-semibold text-sm">
                {chiefAssignment?.user.fullName ?? "(หัวหน้าเวรประจำวัน)"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">หัวหน้าเวรประจำวัน</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-800 mb-2 h-12" />
              <p className="font-semibold text-sm">(............................................)</p>
              <p className="text-xs text-gray-500 mt-0.5">ผู้บริหารรับทราบ</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-3 border-t border-gray-200 text-xs text-gray-400 text-center">
            ระบบตรวจการเข้าเวร · วิทยาลัยเทคโนโลยีสันตพล · พิมพ์เมื่อ {printedAt}
          </div>
        </div>
      </div>

      {/* CSS พิมพ์ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { font-family: 'Sarabun', Arial, sans-serif; font-size: 11px; }
        }
      `}} />
    </>
  );
}
