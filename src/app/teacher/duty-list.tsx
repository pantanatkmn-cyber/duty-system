"use client";

import Link from "next/link";
import { useState } from "react";
import { CameraModal } from "./camera-modal";

interface DutyType {
  id: number;
  code: string;
  name: string;
  category: string;
  startTime: string;
  endTime: string;
}

interface CheckIn {
  id: number;
  checkInTime: string;
  photoPath: string;
  status: string;
}

export interface Assignment {
  id: number;
  note: string | null;
  dutyType: DutyType;
  checkIn: CheckIn | null;
}

interface Props {
  assignments: Assignment[];
  userName: string;
}

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

function formatThaiTime(isoString: string) {
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} น.`;
}

export function DutyList({ assignments, userName }: Props) {
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(null);

  if (assignments.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-400">
        <p className="text-5xl mb-4">🌤️</p>
        <p className="font-medium text-gray-600">ไม่มีเวรวันนี้</p>
        <p className="text-sm mt-1">พักผ่อนได้เลยครับ</p>
      </div>
    );
  }

  const activeAssignment = assignments.find((a) => a.id === activeAssignmentId);

  return (
    <>
      <div className="space-y-3">
        {assignments.map((a) => {
          const checked = !!a.checkIn;
          const status = a.checkIn?.status;

          return (
            <div
              key={a.id}
              className={`card !p-0 overflow-hidden border-l-4 ${
                checked
                  ? status === "ON_TIME"
                    ? "border-green-500"
                    : "border-yellow-500"
                  : "border-gray-300"
              }`}
            >
              {/* ส่วนข้อมูลเวร — คลิกเพื่อดูรายละเอียด */}
              <Link
                href={`/teacher/duty/${a.id}`}
                className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {/* ชื่อเวร */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">
                      {CATEGORY_ICON[a.dutyType.category] ?? "📋"}
                    </span>
                    <h4 className="font-semibold text-gray-800 truncate">
                      {a.dutyType.name}
                    </h4>
                  </div>

                  {/* เวลา + category badge */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      {a.dutyType.startTime} – {a.dutyType.endTime} น.
                    </span>
                    <span className="badge badge-info text-xs">
                      {CATEGORY_LABEL[a.dutyType.category] ?? a.dutyType.category}
                    </span>
                  </div>

                  {/* หมายเหตุ */}
                  {a.note && (
                    <p className="text-xs text-gray-400 mt-1">หมายเหตุ: {a.note}</p>
                  )}

                  {/* สถานะหลังเช็กอิน */}
                  {checked && a.checkIn && (
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`badge ${
                          status === "ON_TIME" ? "badge-success" : "badge-warning"
                        }`}
                      >
                        {status === "ON_TIME" ? "✓ ตรงเวลา" : "⚠ มาสาย"}
                      </span>
                      <span className="text-xs text-gray-500">
                        เช็กอิน {formatThaiTime(a.checkIn.checkInTime)}
                      </span>
                    </div>
                  )}
                </div>

                {/* ลูกศรชี้ว่า clickable */}
                <span className="text-gray-300 text-xl shrink-0 self-center">›</span>
              </Link>

              {/* ปุ่มเช็กอิน (แสดงเฉพาะเมื่อยังไม่เช็กอิน) */}
              {!checked && (
                <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3">
                  <button
                    onClick={() => setActiveAssignmentId(a.id)}
                    className="btn-primary text-sm"
                  >
                    📷 เช็กอิน
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Camera Modal */}
      {activeAssignment && (
        <CameraModal
          assignmentId={activeAssignment.id}
          dutyName={activeAssignment.dutyType.name}
          userName={userName}
          startTime={activeAssignment.dutyType.startTime}
          onClose={() => setActiveAssignmentId(null)}
        />
      )}
    </>
  );
}
