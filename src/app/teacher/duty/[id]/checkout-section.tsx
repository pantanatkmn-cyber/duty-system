"use client";

import { useState } from "react";
import { CheckoutModal } from "./checkout-modal";
import { blobPhotoUrl } from "@/lib/photo-url";

interface CheckOutData {
  checkOutTime: string;
  checkOutPhoto: string;
  checkOutStatus: string;
}

interface Props {
  assignmentId: number;
  dutyName: string;
  userName: string;
  endTime: string;              // "HH:mm" — endTime ของ dutyType (ส่งให้ modal)
  checkoutReadyTime: string;    // "HH:mm" — ออกได้ตั้งแต่เวลานี้ (แสดงในปุ่ม)
  checkoutDeadlineTime: string; // "HH:mm" — เกินนี้ขึ้น "ลืมออกเวร"
  hasCheckIn: boolean;
  checkOut: CheckOutData | null;
}

const STATUS_LABEL: Record<string, string> = {
  EARLY_OUT:   "⏰ ออกเวรก่อนกำหนด",
  ON_TIME_OUT: "✓ ออกเวรตรงเวลา",
  LATE_OUT:    "⚠ ออกเวรช้า",
};
const STATUS_BADGE: Record<string, string> = {
  EARLY_OUT:   "badge-info",
  ON_TIME_OUT: "badge-success",
  LATE_OUT:    "badge-warning",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
}

function isForgotCheckout(endTime: string): boolean {
  const now = new Date();
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return now > end;
}

export function CheckoutSection({
  assignmentId, dutyName, userName, endTime, checkoutReadyTime, checkoutDeadlineTime, hasCheckIn, checkOut,
}: Props) {
  const [showModal, setShowModal] = useState(false);

  // ยังไม่เช็กอิน — ไม่แสดงส่วนออกเวร
  if (!hasCheckIn) return null;

  // ออกเวรแล้ว — แสดงผล
  if (checkOut) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">สถานะการออกเวร</h3>
        <div className="flex items-start gap-4">
          <a href={blobPhotoUrl(checkOut.checkOutPhoto) ?? "#"} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src={blobPhotoUrl(checkOut.checkOutPhoto) ?? ""}
              alt="รูปออกเวร"
              className="h-24 w-24 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
            />
          </a>
          <div className="flex-1 min-w-0">
            <span className={`badge ${STATUS_BADGE[checkOut.checkOutStatus] ?? "badge-info"} mb-1`}>
              {STATUS_LABEL[checkOut.checkOutStatus] ?? checkOut.checkOutStatus}
            </span>
            <p className="text-sm text-gray-600 mt-1">
              ออกเวรเมื่อ <span className="font-medium">{formatTime(checkOut.checkOutTime)}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">คลิกที่รูปเพื่อดูขนาดเต็ม</p>
          </div>
        </div>
      </div>
    );
  }

  // เช็กอินแล้วแต่ยังไม่ออกเวร
  const forgot = isForgotCheckout(checkoutDeadlineTime);

  return (
    <>
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">สถานะการออกเวร</h3>
        <div className="flex items-center justify-between">
          <div>
            {forgot ? (
              <span className="badge badge-danger text-sm">⚠ ลืมออกเวร</span>
            ) : (
              <p className="text-sm text-gray-600">ยังไม่ได้ออกเวร</p>
            )}
            <p className="text-xs text-gray-400 mt-1">ออกเวรได้ตั้งแต่ {checkoutReadyTime} น.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-secondary text-sm">
            📷 ออกเวร
          </button>
        </div>
      </div>

      {showModal && (
        <CheckoutModal
          assignmentId={assignmentId}
          dutyName={dutyName}
          userName={userName}
          endTime={endTime}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
