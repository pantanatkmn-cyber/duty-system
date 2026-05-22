"use client";

import { useState } from "react";
import { CameraModal } from "@/app/teacher/camera-modal";
import { blobPhotoUrl } from "@/lib/photo-url";
import { formatThaiTime } from "@/lib/thai-time";

interface CheckIn {
  id: number;
  checkInTime: string;
  photoPath: string | null;
  status: string;
  note: string | null;
}

interface Props {
  assignmentId: number;
  dutyName: string;
  userName: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  checkIn: CheckIn | null;
}


function isAbsent(endTime: string): boolean {
  const now = new Date();
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return now > end;
}

export function CheckInSection({ assignmentId, dutyName, userName, startTime, endTime, checkIn }: Props) {
  const [showCamera, setShowCamera] = useState(false);
  const absent = !checkIn && isAbsent(endTime);

  if (checkIn) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">สถานะการเช็กอิน</h3>
        <div className="flex items-start gap-4">
          {/* รูปถ่าย (อาจถูกล้างโดย cleanup job) */}
          {checkIn.photoPath ? (
            <a href={blobPhotoUrl(checkIn.photoPath) ?? "#"} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img
                src={blobPhotoUrl(checkIn.photoPath) ?? ""}
                alt="รูปเช็กอิน"
                className="h-24 w-24 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
              />
            </a>
          ) : (
            <div className="h-24 w-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <span className="text-xs text-gray-400 text-center">ไม่มีรูป</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`badge ${
                  checkIn.status === "ON_TIME"
                    ? "badge-success"
                    : checkIn.status === "EARLY"
                    ? "badge-info"
                    : "badge-warning"
                }`}
              >
                {checkIn.status === "ON_TIME"
                  ? "✓ ตรงเวลา"
                  : checkIn.status === "EARLY"
                  ? "⏰ เข้าเวรก่อนเวลา"
                  : "⚠ มาสาย"}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              เช็กอินเมื่อ{" "}
              <span className="font-medium">{formatThaiTime(checkIn.checkInTime)}</span>
            </p>
            {checkIn.note && (
              <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                สาเหตุ: {checkIn.note}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">สถานะการเช็กอิน</h3>
        <div className="flex items-center justify-between">
          {absent ? (
            <div>
              <span className="badge badge-danger">❌ ขาดเวร</span>
              <p className="text-xs text-gray-400 mt-1">เลยเวลาเวรแล้ว ({endTime} น.)</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">ยังไม่ได้เช็กอิน</p>
          )}
          {!absent && (
            <button onClick={() => setShowCamera(true)} className="btn-primary text-sm">
              📷 เช็กอิน
            </button>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraModal
          assignmentId={assignmentId}
          dutyName={dutyName}
          userName={userName}
          startTime={startTime}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
