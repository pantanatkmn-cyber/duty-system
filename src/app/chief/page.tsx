import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { DatePicker } from "./date-picker";
import { PrintButton } from "./print-button";
import { blobPhotoUrl } from "@/lib/photo-url";
import { DownloadPhotosButton } from "./download-photos-button";
import { ExemptButton } from "./exempt-button";
import { formatThaiTime } from "@/lib/thai-time";

// ===== ค่าคงที่ =====
const CATEGORY_LABEL: Record<string, string> = {
  FRONT_GATE: "เวรประตูหน้า",
  POINT: "เวรประจำจุด",
  PERIOD: "เวรคาบ",
};

const CATEGORY_ICON: Record<string, string> = {
  FRONT_GATE: "🏫",
  POINT: "📍",
  PERIOD: "📚",
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


function getStatusInfo(checkIn: { status: string } | null) {
  if (!checkIn) return { label: "ยังไม่เช็กอิน", cls: "badge-danger" };
  if (checkIn.status === "ON_TIME") return { label: "ตรงเวลา", cls: "badge-success" };
  if (checkIn.status === "LATE") return { label: "สาย", cls: "badge-warning" };
  return { label: checkIn.status, cls: "badge-info" };
}

// ===== Page =====
interface Props {
  searchParams: { date?: string };
}

export default async function ChiefPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // กำหนดวันที่จาก query หรือใช้วันนี้
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateStr = searchParams.date ?? todayStr;

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const startOfNextDay = new Date(year, month - 1, day + 1, 0, 0, 0);

  // แปลง JS getDay() → dayOfWeek (1=จันทร์…5=ศุกร์)
  const jsDay = new Date(year, month - 1, day).getDay(); // 0=อาทิตย์
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=จันทร์…7=อาทิตย์

  // ตรวจสิทธิ์: ADMIN/CHIEF เข้าได้เลย
  // TEACHER ต้องเป็นหัวหน้าเวรของวันนี้ (ตรวจจาก WeeklyChiefAssignment)
  if (session.user.role !== "ADMIN" && session.user.role !== "CHIEF") {
    const todayJsDay = now.getDay();
    const todayDayOfWeek = todayJsDay === 0 ? 7 : todayJsDay;
    const myChiefRecord = await prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek: todayDayOfWeek },
    });
    const isWeeklyChief = myChiefRecord?.userId === Number(session.user.id);
    if (!isWeeklyChief) redirect("/dashboard");
  }

  // ดึงข้อมูลพร้อมกัน
  const [assignments, chiefAssignment] = await Promise.all([
    prisma.dutyAssignment.findMany({
      where: { dutyDate: { gte: startOfDay, lt: startOfNextDay } },
      include: {
        user: { select: { id: true, fullName: true } },
        dutyType: true,
        checkIn: true,
        incidents: {
          include: { photos: true },
          orderBy: { reportedAt: "asc" },
        },
      },
      orderBy: [{ dutyType: { startTime: "asc" } }, { user: { fullName: "asc" } }],
    }),
    // ดึงหัวหน้าเวรจาก WeeklyChiefAssignment ตามวันในสัปดาห์
    prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  // แยก: อนุโลม vs ปกติ
  const exemptedCount = assignments.filter((a) => a.exempted).length;
  const activeAssignments = assignments.filter((a) => !a.exempted);

  // คำนวณสถิติเฉพาะเวรที่ไม่ได้อนุโลม
  const total = activeAssignments.length;
  const checkedIn = activeAssignments.filter((a) => !!a.checkIn).length;
  const onTime = activeAssignments.filter((a) => a.checkIn?.status === "ON_TIME" || a.checkIn?.status === "EARLY").length;
  const late = activeAssignments.filter((a) => a.checkIn?.status === "LATE").length;
  const absent = total - checkedIn;
  const totalIncidents = assignments.reduce((sum, a) => sum + a.incidents.length, 0);

  // จัดกลุ่มตามประเภทเวร (แสดงทุกเวรรวมถึงที่อนุโลม)
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABEL[cat],
    icon: CATEGORY_ICON[cat],
    items: assignments.filter((a) => a.dutyType.category === cat),
  })).filter((g) => g.items.length > 0);

  // รวมเหตุการณ์ทั้งหมดพร้อมข้อมูลครู
  const allIncidents = assignments.flatMap((a) =>
    a.incidents.map((inc) => ({
      ...inc,
      teacherName: a.user.fullName,
      dutyName: a.dutyType.name,
    }))
  );

  const thaiDate = formatThaiDate(dateStr);
  const isToday = dateStr === todayStr;

  // นับรูปทั้งหมดในวันนี้ (เช็กอิน + ออกเวร + เหตุการณ์)
  const totalPhotos = assignments.reduce((sum, a) => {
    let n = 0;
    if (a.checkIn?.photoPath) n++;
    if (a.checkIn?.checkOutPhoto) n++;
    n += a.incidents.reduce((s, inc) => s + inc.photos.length, 0);
    return sum + n;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-10 w-10 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div>
              <h1 className="font-semibold text-gray-800 leading-tight text-sm">ระบบตรวจการเข้าเวร</h1>
              <p className="text-xs text-gray-500">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* ปุ่มกลับ */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium"
        >
          ← กลับหน้าหลัก
        </Link>

        {/* เลือกวันที่ + ปุ่มพิมพ์ */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">ดูรายงานวันที่:</span>
              <DatePicker currentDate={dateStr} />
              {isToday && <span className="badge badge-success text-xs">วันนี้</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {total > 0 && <PrintButton date={dateStr} />}
              {totalPhotos > 0 && (
                <DownloadPhotosButton date={dateStr} photoCount={totalPhotos} />
              )}
            </div>
          </div>
        </div>

        {/* หัวข้อรายงาน + หัวหน้าเวร */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">รายงานสรุปเวรประจำวัน</h2>
              <p className="text-sm text-gray-500 mt-0.5">{thaiDate}</p>
            </div>
            {chiefAssignment ? (
              <div className="rounded-lg bg-brand-orange-50 border border-brand-orange-200 px-4 py-2 text-sm shrink-0">
                <p className="text-xs text-brand-orange-600 font-medium">หัวหน้าเวรประจำวัน</p>
                <p className="font-semibold text-brand-orange-800">{chiefAssignment.user.fullName}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-sm shrink-0">
                <p className="text-xs text-gray-400">ยังไม่ได้กำหนดหัวหน้าเวร</p>
              </div>
            )}
          </div>
        </div>

        {total === 0 ? (
          /* ไม่มีข้อมูล */
          <div className="card text-center py-14">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">ไม่มีข้อมูลเวรในวันที่เลือก</p>
            <p className="text-sm text-gray-400 mt-1">กรุณาเลือกวันที่อื่น หรือให้ Admin มอบหมายเวร</p>
          </div>
        ) : (
          <>
            {/* สรุปสถิติ (ไม่นับเวรที่อนุโลม) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "เวรทั้งหมด", value: total, bg: "bg-gray-100", text: "text-gray-800" },
                { label: "เช็กอินแล้ว", value: checkedIn, bg: "bg-green-50", text: "text-green-800" },
                { label: "ตรงเวลา", value: onTime, bg: "bg-blue-50", text: "text-blue-800" },
                { label: "สาย", value: late, bg: "bg-yellow-50", text: "text-yellow-800" },
                {
                  label: "ขาด / ยังไม่เช็กอิน",
                  value: absent,
                  bg: absent > 0 ? "bg-red-50" : "bg-gray-50",
                  text: absent > 0 ? "text-red-800" : "text-gray-400",
                },
                {
                  label: "อนุโลม",
                  value: exemptedCount,
                  bg: exemptedCount > 0 ? "bg-purple-50" : "bg-gray-50",
                  text: exemptedCount > 0 ? "text-purple-800" : "text-gray-400",
                },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
                  <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                  <p className={`text-xs mt-1 ${s.text} opacity-80`}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* รายการเวรแยกตามประเภท */}
            {grouped.map((group) => (
              <div key={group.category} className="card">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">{group.icon}</span>
                  <span>{group.label}</span>
                  <span className="text-xs font-normal text-gray-400 ml-1">({group.items.length} คน)</span>
                </h3>
                <div className="space-y-2">
                  {group.items.map((a) => {
                    const status = getStatusInfo(a.checkIn);
                    return (
                      <div key={a.id} className="flex items-stretch gap-2">
                        {/* การ์ดหลัก — คลิกไปดูรายละเอียด */}
                        <Link
                          href={`/chief/duty/${a.id}?from=${dateStr}`}
                          className={`flex-1 flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:border-brand-orange-200 transition-colors ${
                            a.exempted
                              ? "bg-purple-50 border-purple-100 opacity-70 hover:opacity-100"
                              : "bg-gray-50 border-gray-100 hover:bg-brand-orange-50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800 truncate">{a.user.fullName}</p>
                              {a.exempted && (
                                <span className="badge badge-info text-xs shrink-0">
                                  🏳 อนุโลม{a.exemptReason ? ` · ${a.exemptReason}` : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {a.dutyType.name} &nbsp;({a.dutyType.startTime}–{a.dutyType.endTime} น.)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {a.checkIn && (
                              <span className="text-xs text-gray-500">
                                {formatThaiTime(a.checkIn.checkInTime.toISOString())}
                              </span>
                            )}
                            {!a.exempted && (
                              <span className={`badge ${status.cls} text-xs`}>{status.label}</span>
                            )}
                            {a.incidents.length > 0 && (
                              <span className="badge badge-warning text-xs">⚠️ {a.incidents.length}</span>
                            )}
                            <span className="text-gray-300 text-lg">›</span>
                          </div>
                        </Link>

                        {/* ปุ่มอนุโลม */}
                        <div className="flex items-center">
                          <ExemptButton
                            assignmentId={a.id}
                            teacherName={a.user.fullName}
                            dutyName={a.dutyType.name}
                            exempted={a.exempted}
                            exemptReason={a.exemptReason}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* เหตุการณ์ผิดปกติ */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <span>เหตุการณ์ผิดปกติ</span>
                {totalIncidents > 0 && (
                  <span className="badge badge-warning text-xs">{totalIncidents} รายการ</span>
                )}
              </h3>

              {allIncidents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  ✅ ไม่มีรายงานเหตุการณ์ผิดปกติ
                </p>
              ) : (
                <div className="space-y-3">
                  {allIncidents.map((inc) => (
                    <div key={inc.id} className="rounded-xl border border-yellow-100 bg-yellow-50 p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-yellow-800">{inc.incidentType}</span>
                            <span className="text-xs text-gray-500">
                              — {inc.teacherName} ({inc.dutyName})
                            </span>
                          </div>
                          {inc.description && (
                            <p className="text-sm text-gray-700 mt-0.5">{inc.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            รายงานเมื่อ {formatThaiTime(inc.reportedAt.toISOString())}
                          </p>
                        </div>
                      </div>
                      {inc.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {inc.photos.map((p) => (
                            <a key={p.id} href={blobPhotoUrl(p.photoPath) ?? "#"} target="_blank" rel="noopener noreferrer">
                              <img
                                src={blobPhotoUrl(p.photoPath) ?? ""}
                                alt="รูปเหตุการณ์"
                                className="h-16 w-16 rounded-lg object-cover border border-yellow-200 hover:opacity-80 transition"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
