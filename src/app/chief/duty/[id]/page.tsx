import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/app/dashboard/logout-button";
import Link from "next/link";

const CATEGORY_ICON: Record<string, string> = {
  FRONT_GATE: "🏫",
  POINT: "📍",
  PERIOD: "📚",
};

const CATEGORY_LABEL: Record<string, string> = {
  FRONT_GATE: "ประตูหน้า",
  POINT: "ประจำจุด",
  PERIOD: "เวรคาบ",
};

const INCIDENT_ICONS: Record<string, string> = {
  "พบความสกปรกในพื้นที่": "🗑️",
  "ห้องหรือหน้าต่างไม่ปิด": "🚪",
  "ไม่ปิดไฟ": "💡",
  "พบนักเรียนมั่วสุม": "👥",
  "พบนักเรียนทะเลาะวิวาท": "⚠️",
  "พบบุหรี่/อื่นๆ": "🚬",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

interface Props {
  params: { id: string };
  searchParams: { from?: string };
}

export default async function ChiefDutyDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // ตรวจสิทธิ์: ADMIN/CHIEF เข้าได้เลย, TEACHER ต้องเป็นหัวหน้าเวรวันนี้
  if (session.user.role !== "ADMIN" && session.user.role !== "CHIEF") {
    const now = new Date();
    const jsDay = now.getDay();
    const todayDow = jsDay === 0 ? 7 : jsDay;
    const myChief = await prisma.weeklyChiefAssignment.findUnique({
      where: { dayOfWeek: todayDow },
    });
    if (myChief?.userId !== Number(session.user.id)) redirect("/dashboard");
  }

  const assignmentId = parseInt(params.id);
  if (isNaN(assignmentId)) notFound();

  const assignment = await prisma.dutyAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      user: { select: { fullName: true } },
      dutyType: true,
      checkIn: true,
      incidents: {
        include: { photos: true },
        orderBy: { reportedAt: "asc" },
      },
    },
  });

  if (!assignment) notFound();

  const ci = assignment.checkIn;
  const backDate = searchParams.from ?? "";
  const backUrl = backDate ? `/chief?date=${backDate}` : "/chief";

  // สถานะเช็กอิน
  const statusInfo = !ci
    ? { label: "ยังไม่เช็กอิน", cls: "badge-danger" }
    : ci.status === "ON_TIME" ? { label: "ตรงเวลา", cls: "badge-success" }
    : ci.status === "EARLY"  ? { label: "มาก่อนเวลา", cls: "badge-info" }
    : { label: "มาสาย", cls: "badge-warning" };

  const checkoutStatusInfo = !ci?.checkOutTime
    ? null
    : ci.checkOutStatus === "ON_TIME_OUT" ? { label: "ออกตรงเวลา", cls: "badge-success" }
    : ci.checkOutStatus === "EARLY_OUT"   ? { label: "ออกก่อนเวลา", cls: "badge-warning" }
    : { label: "ออกหลังเวลา", cls: "badge-info" };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-9 w-9 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div className="leading-tight">
              <p className="font-semibold text-gray-800 text-sm">ระบบตรวจการเข้าเวร</p>
              <p className="text-xs text-gray-400">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Link href={backUrl} className="inline-flex items-center gap-1 text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้ารายงานประจำวัน
        </Link>

        {/* ข้อมูลเวร */}
        <div className="card">
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">{CATEGORY_ICON[assignment.dutyType.category] ?? "📋"}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-800">{assignment.dutyType.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-500">
                  {assignment.dutyType.startTime} – {assignment.dutyType.endTime} น.
                </span>
                <span className="badge badge-info text-xs">
                  {CATEGORY_LABEL[assignment.dutyType.category] ?? assignment.dutyType.category}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-500">ครูเวร:</span>
                <span className="text-sm font-semibold text-gray-800">{assignment.user.fullName}</span>
              </div>
              {assignment.note && (
                <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                  <p className="text-xs text-yellow-800">
                    <span className="font-semibold">หมายเหตุจาก admin:</span> {assignment.note}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* สถานะเช็กอิน */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">สถานะการเช็กอิน</h3>
          {ci ? (
            <div className="flex items-start gap-4">
              {ci.photoPath ? (
                <a href={ci.photoPath} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={ci.photoPath}
                    alt="รูปเช็กอิน"
                    className="h-24 w-24 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
                  />
                </a>
              ) : (
                <div className="h-24 w-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-xs text-gray-400">ไม่มีรูป</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>
                <p className="text-sm text-gray-600">
                  เช็กอินเมื่อ <span className="font-medium">{formatTime(ci.checkInTime.toISOString())}</span>
                </p>
                {ci.note && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                    สาเหตุ: {ci.note}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
            </div>
          )}
        </div>

        {/* สถานะออกเวร */}
        {ci?.checkOutTime && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">สถานะการออกเวร</h3>
            <div className="flex items-start gap-4">
              {ci.checkOutPhoto && (
                <a href={ci.checkOutPhoto} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={ci.checkOutPhoto}
                    alt="รูปออกเวร"
                    className="h-24 w-24 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
                  />
                </a>
              )}
              <div className="flex-1 min-w-0">
                {checkoutStatusInfo && (
                  <span className={`badge ${checkoutStatusInfo.cls} mb-1`}>{checkoutStatusInfo.label}</span>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  ออกเวรเมื่อ <span className="font-medium">{formatTime(ci.checkOutTime.toISOString())}</span>
                </p>
                {ci.checkOutPhoto && (
                  <p className="text-xs text-gray-400 mt-1">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* หมายเหตุจากครู */}
        {assignment.teacherNote && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">หมายเหตุจากครู</h3>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.teacherNote}</p>
            </div>
          </div>
        )}

        {/* รายงานเหตุการณ์ผิดปกติ */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-500">รายงานเหตุการณ์ผิดปกติ</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              assignment.incidents.length > 0 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
            }`}>
              {assignment.incidents.length} รายการ
            </span>
          </div>

          {assignment.incidents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">ไม่มีรายงานเหตุการณ์</p>
          ) : (
            <div className="space-y-3">
              {assignment.incidents.map((inc) => (
                <div key={inc.id} className="rounded-xl border border-yellow-100 bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{INCIDENT_ICONS[inc.incidentType] ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{inc.incidentType}</p>
                      {inc.description && (
                        <p className="text-sm text-gray-600 mt-0.5">{inc.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">รายงานเมื่อ {formatTime(inc.reportedAt.toISOString())}</p>
                    </div>
                  </div>
                  {inc.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-8">
                      {inc.photos.map((p) => (
                        <a key={p.id} href={p.photoPath} target="_blank" rel="noopener noreferrer">
                          <img
                            src={p.photoPath}
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
      </main>
    </div>
  );
}
