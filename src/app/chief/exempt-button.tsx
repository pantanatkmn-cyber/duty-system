"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  assignmentId: number;
  teacherName: string;
  dutyName: string;
  exempted: boolean;
  exemptReason: string | null;
}

const EXEMPT_REASONS = [
  "ไปราชการ",
  "ธุระด่วน",
  "ลาป่วย",
  "ลากิจ",
  "อื่นๆ",
];

export function ExemptButton({ assignmentId, teacherName, dutyName, exempted, exemptReason }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState(exemptReason ?? "");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(newExempted: boolean) {
    setLoading(true);
    const finalReason = newExempted
      ? (reason === "อื่นๆ" ? customReason.trim() : reason)
      : "";

    const res = await fetch(`/api/chief/assignments/${assignmentId}/exempt`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exempted: newExempted, reason: finalReason }),
    });
    setLoading(false);
    if (res.ok) {
      setShowModal(false);
      router.refresh();
    }
  }

  return (
    <>
      {/* ปุ่ม — ขนาดเล็ก วางข้างการ์ด */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModal(true); }}
        className={`shrink-0 text-xs font-medium px-2 py-1 rounded-lg border transition ${
          exempted
            ? "bg-gray-100 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            : "bg-white text-brand-orange-600 border-brand-orange-200 hover:bg-brand-orange-50"
        }`}
        title={exempted ? "ยกเลิกการอนุโลม" : "อนุโลมเวร"}
      >
        {exempted ? "✓ อนุโลมแล้ว" : "อนุโลม"}
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            {exempted ? (
              /* ยกเลิกการอนุโลม */
              <>
                <h3 className="text-lg font-bold text-gray-800 mb-1">ยกเลิกการอนุโลม</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">{teacherName}</span> — {dutyName}
                </p>
                {exemptReason && (
                  <p className="text-xs text-gray-400 mb-4">เหตุผลเดิม: {exemptReason}</p>
                )}
                <p className="text-sm text-gray-600 mb-5">
                  ยืนยันยกเลิกการอนุโลม? ครูจะถูกนับในสถิติอีกครั้ง
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowModal(false)} disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                    ยกเลิก
                  </button>
                  <button onClick={() => handleSubmit(false)} disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">
                    {loading ? "กำลังบันทึก..." : "ยกเลิกการอนุโลม"}
                  </button>
                </div>
              </>
            ) : (
              /* อนุโลมเวร */
              <>
                <h3 className="text-lg font-bold text-gray-800 mb-1">อนุโลมเวร</h3>
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">{teacherName}</span> — {dutyName}
                </p>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">เหตุผล</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {EXEMPT_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`px-3 py-2 rounded-lg text-sm border transition text-left ${
                          reason === r
                            ? "bg-brand-orange-500 text-white border-brand-orange-500"
                            : "bg-white text-gray-700 border-gray-200 hover:border-brand-orange-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason === "อื่นๆ" && (
                    <input
                      type="text"
                      placeholder="ระบุเหตุผล..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="form-input text-sm w-full mt-2"
                      autoFocus
                    />
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  เวรนี้จะไม่ถูกนับในสถิติ และแสดงเป็น "อนุโลมแล้ว" ในรายงาน
                </p>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowModal(false)} disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50">
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={loading || !reason || (reason === "อื่นๆ" && !customReason.trim())}
                    className="px-4 py-2 rounded-lg text-sm text-white bg-brand-orange-500 hover:bg-brand-orange-600 disabled:opacity-40"
                  >
                    {loading ? "กำลังบันทึก..." : "ยืนยันอนุโลม"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
