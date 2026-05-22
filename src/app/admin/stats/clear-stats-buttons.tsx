"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  // วันที่ปัจจุบันที่กำลังดูอยู่ (สำหรับ "ล้างช่วงนี้")
  startStr: string; // "YYYY-MM-DD"
  endStr: string;   // "YYYY-MM-DD"
  rangeLabel: string;
}

type ModalMode = "range" | "all" | null;

export default function ClearStatsButtons({ startStr, endStr, rangeLabel }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalMode>(null);
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  async function handleClear() {
    setLoading(true);
    try {
      const body =
        modal === "all"
          ? { mode: "all" }
          : { mode: "range", start: startStr, end: endStr };

      const res = await fetch("/api/admin/stats/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setResultMsg(`เกิดข้อผิดพลาด: ${data.error ?? "ไม่ทราบสาเหตุ"}`);
      } else {
        setResultMsg(
          `${data.message} (เช็กอิน ${data.deletedCheckIns} รายการ, เหตุการณ์ ${data.deletedIncidents} รายการ)`
        );
        router.refresh();
      }
    } catch {
      setResultMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
      setModal(null);
    }
  }

  return (
    <>
      {/* ปุ่มล้างสถิติ */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setResultMsg(null); setModal("range"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          ล้างสถิติช่วงนี้
        </button>
        <button
          onClick={() => { setResultMsg(null); setModal("all"); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          ล้างสถิติทั้งหมด
        </button>
      </div>

      {/* แสดงผลลัพธ์หลังทำการล้าง */}
      {resultMsg && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-gray-100 text-sm text-gray-700">
          {resultMsg}
        </div>
      )}

      {/* Modal ยืนยัน */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            {modal === "range" ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🗑️</span>
                  <h3 className="text-lg font-bold text-gray-800">ยืนยันล้างสถิติช่วงนี้</h3>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  จะลบข้อมูลเช็กอินและรายงานเหตุการณ์ในช่วง:
                </p>
                <p className="text-sm font-semibold text-orange-700 bg-orange-50 rounded-lg px-3 py-2 mb-4">
                  {rangeLabel}
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลการมอบหมายเวรจะยังอยู่ครบ แต่สถิติการเช็กอินและเหตุการณ์จะถูกลบ
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-lg font-bold text-red-700">ยืนยันล้างสถิติทั้งหมด</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  จะลบ <strong>ข้อมูลเช็กอินและรายงานเหตุการณ์ทั้งหมดในระบบ</strong> ทุกช่วงเวลา
                </p>
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-5">
                  การกระทำนี้ไม่สามารถย้อนกลับได้เลย ข้อมูลการมอบหมายเวรจะยังอยู่ แต่ประวัติการเช็กอินและเหตุการณ์ทั้งหมดจะหายไป
                </p>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal(null)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
                  modal === "all"
                    ? "bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                    : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
                }`}
              >
                {loading ? "กำลังล้าง..." : modal === "all" ? "ล้างทั้งหมด" : "ยืนยันล้างช่วงนี้"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
