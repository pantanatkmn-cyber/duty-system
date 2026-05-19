"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  assignmentId: number;
  dutyName: string;
  userName: string;
  endTime: string; // "HH:mm"
  onClose: () => void;
}

const THAI_MONTHS_SHORT = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

function getThaiDateTime(date: Date) {
  const d = date.getDate();
  const m = THAI_MONTHS_SHORT[date.getMonth()];
  const y = date.getFullYear() + 543;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${d} ${m} ${y}  ${hh}:${mm}:${ss}`;
}

type Phase = "camera" | "preview" | "uploading" | "done" | "error";

export function CheckoutModal({ assignmentId, dutyName, userName, endTime, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [captureTime, setCaptureTime] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [checkOutStatus, setCheckOutStatus] = useState<string | null>(null);
  const router = useRouter();

  // ตรวจสอบว่าออกเวรก่อนกำหนดหรือไม่
  const isEarlyOut = (() => {
    if (!captureTime) return false;
    const [h, m] = endTime.split(":").map(Number);
    const end = new Date(captureTime.getFullYear(), captureTime.getMonth(), captureTime.getDate(), h, m, 0);
    const earlyWindow = new Date(end.getTime() - 5 * 60 * 1000);
    return captureTime < earlyWindow;
  })();

  useEffect(() => {
    openCamera();
    return () => stopCamera();
  }, []);

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setPhase("error");
      setErrorMsg("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function captureAndStamp() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const now = new Date();
    setCaptureTime(now);

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const lines = [
      getThaiDateTime(now),
      `ชื่อ: ${userName}`,
      `ออกเวร: ${dutyName}`,
    ];

    const fontSize = Math.max(18, Math.floor(canvas.width * 0.022));
    ctx.font = `bold ${fontSize}px Sarabun, Arial, sans-serif`;
    const padding = 14;
    const lineHeight = fontSize * 1.5;
    const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW = maxWidth + padding * 2;
    const boxH = lines.length * lineHeight + padding * 2;
    const bx = 10;
    const by = canvas.height - boxH - 10;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + padding, by + padding + lineHeight * (i + 1) - fontSize * 0.2);
    });

    stopCamera();
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          setPhase("preview");
        }
      },
      "image/jpeg",
      0.88
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setCaptureTime(null);
    setPhase("camera");
    openCamera();
  }

  async function uploadPhoto() {
    if (!capturedBlob) return;
    setPhase("uploading");

    const fd = new FormData();
    fd.append("assignmentId", String(assignmentId));
    fd.append("photo", capturedBlob, "checkout.jpg");

    try {
      const res = await fetch("/api/teacher/checkout", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setCheckOutStatus(data.checkOutStatus);
      setPhase("done");
      setTimeout(() => { router.refresh(); onClose(); }, 2000);
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด");
    }
  }

  const statusLabel: Record<string, string> = {
    EARLY_OUT: "⏰ ออกเวรก่อนกำหนด",
    ON_TIME_OUT: "✓ ออกเวรตรงเวลา",
    LATE_OUT: "⚠ ออกเวรช้า",
  };
  const statusBadge: Record<string, string> = {
    EARLY_OUT: "badge-info",
    ON_TIME_OUT: "badge-success",
    LATE_OUT: "badge-warning",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 overflow-hidden">
        <div className="bg-brand-orange-500 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">ออกเวร</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-4">
          <p className="text-center text-sm font-medium text-gray-700 mb-3">{dutyName}</p>

          {phase === "camera" && (
            <>
              <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-gray-400 text-center mt-2">
                เวลาสิ้นสุดเวร {endTime} น. · ออกก่อนได้ 5 นาที
              </p>
              <button onClick={captureAndStamp} className="btn-primary w-full mt-3">
                📷 ถ่ายรูปออกเวร
              </button>
            </>
          )}

          {phase === "preview" && previewUrl && (
            <>
              <div className="rounded-xl overflow-hidden">
                <img src={previewUrl} alt="ภาพออกเวร" className="w-full" />
              </div>
              {isEarlyOut && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                  <p className="text-sm text-blue-800">
                    ⏰ ออกเวรก่อน {endTime} น. จะบันทึกเป็น <strong>ออกเวรก่อนกำหนด</strong>
                  </p>
                </div>
              )}
              <div className="flex gap-3 mt-3">
                <button onClick={retake} className="btn-secondary flex-1">ถ่ายใหม่</button>
                <button onClick={uploadPhoto} className="btn-primary flex-1">ยืนยันออกเวร</button>
              </div>
            </>
          )}

          {phase === "uploading" && (
            <div className="text-center py-10">
              <div className="animate-spin h-12 w-12 border-4 border-brand-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">กำลังบันทึก...</p>
            </div>
          )}

          {phase === "done" && checkOutStatus && (
            <div className="text-center py-10">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-9 w-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-green-700 text-lg">ออกเวรสำเร็จ!</p>
              <p className="mt-2">
                <span className={`badge ${statusBadge[checkOutStatus] ?? "badge-info"}`}>
                  {statusLabel[checkOutStatus] ?? checkOutStatus}
                </span>
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm mb-4">{errorMsg}</p>
              <button onClick={onClose} className="btn-secondary">ปิด</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
