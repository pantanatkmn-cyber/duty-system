import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { CheckInSection } from "./check-in-section";
import { CheckoutSection } from "./checkout-section";
import { IncidentSection } from "./incident-section";
import { TeacherNoteSection } from "./teacher-note-section";

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

interface Props {
  params: { id: string };
}

export default async function DutyDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const assignmentId = parseInt(params.id);
  if (isNaN(assignmentId)) notFound();

  const userId = parseInt(session.user.id);

  const assignment = await prisma.dutyAssignment.findFirst({
    where: { id: assignmentId, userId },
    include: {
      dutyType: true,
      checkIn: true,
      incidents: {
        include: { photos: true },
        orderBy: { reportedAt: "asc" },
      },
    },
  });

  if (!assignment) notFound();

  // ตรวจสอบว่าวันนี้เป็นวันหยุดหรือไม่
  const dutyDate = assignment.dutyDate;
  const startOfDay = new Date(dutyDate.getFullYear(), dutyDate.getMonth(), dutyDate.getDate());
  const startOfNextDay = new Date(dutyDate.getFullYear(), dutyDate.getMonth(), dutyDate.getDate() + 1);
  const holiday = await prisma.holiday.findFirst({
    where: { date: { gte: startOfDay, lt: startOfNextDay } },
  });

  const userName = session.user.name ?? session.user.username;
  const ci = assignment.checkIn;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="โลโก้" className="h-10 w-10 rounded-full object-cover border-2 border-brand-orange-300 shrink-0" />
            <div>
              <h1 className="font-semibold text-gray-800 leading-tight text-sm">ระบบตรวจการเข้าเวร</h1>
              <p className="text-xs text-gray-500">วิทยาลัยเทคโนโลยีสันตพล</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Link href="/teacher" className="inline-flex items-center gap-1 text-sm text-brand-orange-600 hover:text-brand-orange-700 font-medium">
          ← กลับหน้ารายการเวร
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
                {holiday && (
                  <span className="badge badge-warning text-xs">🎌 วันหยุด</span>
                )}
              </div>
              {assignment.dutyType.description && (
                <p className="text-sm text-gray-500 mt-1">{assignment.dutyType.description}</p>
              )}
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

        {/* แบนเนอร์วันหยุด */}
        {holiday ? (
          <div className="card border-yellow-200 bg-yellow-50 text-center py-8">
            <p className="text-4xl mb-3">🎌</p>
            <p className="text-lg font-bold text-yellow-800">{holiday.description}</p>
            <p className="text-sm text-yellow-600 mt-1">วันหยุด — ไม่ต้องเช็กอิน/ออกเวร ไม่นับในสถิติ</p>
          </div>
        ) : (
          <>
            {/* เช็กอิน */}
            <CheckInSection
              assignmentId={assignment.id}
              dutyName={assignment.dutyType.name}
              userName={userName}
              startTime={assignment.dutyType.startTime}
              endTime={assignment.dutyType.endTime}
              checkIn={ci ? {
                id: ci.id,
                checkInTime: ci.checkInTime.toISOString(),
                photoPath: ci.photoPath ?? null,
                status: ci.status,
                note: ci.note ?? null,
              } : null}
            />

            {/* ออกเวร */}
            <CheckoutSection
              assignmentId={assignment.id}
              dutyName={assignment.dutyType.name}
              userName={userName}
              endTime={assignment.dutyType.endTime}
              hasCheckIn={!!ci}
              checkOut={ci?.checkOutTime ? {
                checkOutTime: ci.checkOutTime.toISOString(),
                checkOutPhoto: ci.checkOutPhoto!,
                checkOutStatus: ci.checkOutStatus!,
              } : null}
            />
          </>
        )}

        {/* หมายเหตุจากครู */}
        {!holiday && (
          <TeacherNoteSection
            assignmentId={assignment.id}
            initialNote={assignment.teacherNote ?? null}
          />
        )}

        {/* รายงานเหตุการณ์ผิดปกติ */}
        {!holiday && (
          <IncidentSection
            assignmentId={assignment.id}
            initialIncidents={assignment.incidents.map((inc) => ({
              id: inc.id,
              incidentType: inc.incidentType,
              description: inc.description,
              reportedAt: inc.reportedAt.toISOString(),
              photos: inc.photos.map((p) => ({ id: p.id, photoPath: p.photoPath })),
            }))}
          />
        )}
      </main>
    </div>
  );
}
