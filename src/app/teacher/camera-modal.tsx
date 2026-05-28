"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  assignmentId: number;
  dutyName: string;
  userName: string;
  startTime: string; // "HH:mm" เวลาเริ่มเวร
  onClose: () => void;
}

type Phase = "camera" | "preview" | "uploading" | "done" | "error";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
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

export function CameraModal({ assignmentId, dutyName, userName, startTime, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [captureTime, setCaptureTime] = useState<Date | null>(null);
  const [earlyReason, setEarlyReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<"ON_TIME" | "LATE" | "EARLY" | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // คำนวณว่าเข้าก่อนเวลาหรือไม่ โดยเทียบ captureTime กับ startTime
  const isEarly = (() => {
    if (!captureTime) return false;
    const [h, m] = startTime.split(":").map(Number);
    const dutyStart = new Date(captureTime.getFullYear(), captureTime.getMonth(), captureTime.getDate(), h, m, 0);
    return captureTime < dutyStart;
  })();

  const router = useRouter();

  useEffect(() => {
    openCamera("environment");
    return () => stopCamera();
  }, []);

  async function openCamera(mode: "environment" | "user") {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setPhase("error");
      setErrorMsg("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function flipCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    openCamera(next);
  }

  function captureAndStamp() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // จำกัดขนาด canvas สูงสุด 1280×720
    // ป้องกัน blob ใหญ่เกิน limit ของ server (Vercel 4.5 MB)
    const MAX_W = 1280;
    const MAX_H = 720;
    const videoW = video.videoWidth || MAX_W;
    const videoH = video.videoHeight || MAX_H;
    const scale = Math.min(1, MAX_W / videoW, MAX_H / videoH);
    canvas.width = Math.round(videoW * scale);
    canvas.height = Math.round(videoH * scale);

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // สแตมป์เวลา วันที่ ชื่อ ชื่อเวร ที่มุมล่างซ้าย
    const lines = [
      getThaiDateTime(new Date()),
      `ชื่อ: ${userName}`,
      `เวร: ${dutyName}`,
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

    // กล่องพื้นหลังโปร่งแสง
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();

    // ข้อความ
    ctx.fillStyle = "#ffffff";
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + padding, by + padding + lineHeight * (i + 1) - fontSize * 0.2);
    });

    setCaptureTime(new Date());
    stopCamera();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          setPhase("preview");
        } else {
          // กล้องบางรุ่นอาจ return null — แจ้ง error
          setPhase("error");
          setErrorMsg("ไม่สามารถบันทึกภาพได้ กรุณาลองใหม่อีกครั้ง");
        }
      },
      "image/jpeg",
      0.88
    );
  }

  async function uploadPhoto() {
    if (!capturedBlob) return;
    setPhase("uploading");

    // ตรวจ: ถ้าเข้าก่อนเวลาต้องมีเหตุผล
    if (isEarly && !earlyReason.trim()) {
      setPhase("preview");
      return;
    }

    const fd = new FormData();
    fd.append("assignmentId", String(assignmentId));
    fd.append("photo", capturedBlob, "checkin.jpg");
    if (earlyReason.trim()) fd.append("note", earlyReason.trim());

    try {
      const res = await fetch("/api/teacher/checkin", { method: "POST", body: fd });

      // ป้องกัน: ถ้า server คืน HTML (เช่น 413 Too Large) แทน JSON จะไม่ throw ที่นี่ก่อน
      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        throw new Error("ไฟล์รูปอาจมีขนาดใหญ่เกินไป หรือเกิดข้อผิดพลาดที่ server กรุณาลองถ่ายใหม่");
      }

      if (!res.ok) throw new Error((data.error as string) ?? "เกิดข้อผิดพลาด");

      setCheckInStatus(data.status as "ON_TIME" | "LATE" | "EARLY");
      setPhase("done");
      // รอ 2 วิ แล้ว refresh หน้าเพื่อดึงข้อมูลใหม่
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด");
    }
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setCaptureTime(null);
    setEarlyReason("");
    setPhase("camera");
    openCamera(facingMode);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-brand-orange-500 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">เช็กอินเข้าเวร</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <p className="text-center text-sm font-medium text-gray-700 mb-3">{dutyName}</p>

          {/* กล้องสด */}
          {phase === "camera" && (
            <>
              <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {/* ปุ่มกลับกล้อง */}
                <button
                  onClick={flipCamera}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition"
                  title="กลับกล้อง"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-gray-400 text-center mt-2">
                บังคับใช้กล้องสด — ไม่สามารถเลือกจากคลังภาพได้
              </p>
              <button onClick={captureAndStamp} className="btn-primary w-full mt-3">
                📷 ถ่ายรูปเช็กอิน
              </button>
            </>
          )}

          {/* ดูตัวอย่างภาพ + stamp */}
          {phase === "preview" && previewUrl && (
            <>
              <div className="rounded-xl overflow-hidden">
                <img src={previewUrl} alt="ภาพถ่ายพร้อมสแตมป์" className="w-full" />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                ภาพพร้อมสแตมป์วันเวลาแล้ว
              </p>

              {/* แจ้งเตือนเข้าเวรก่อนเวลา */}
              {isEarly && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    ⏰ คุณถ่ายรูปก่อนเวลาเริ่มเวร ({startTime} น.)
                  </p>
                  <p className="text-xs text-blue-600 mb-2">
                    กรุณาระบุสาเหตุที่เข้าเวรก่อนเวลา
                  </p>
                  <textarea
                    value={earlyReason}
                    onChange={(e) => setEarlyReason(e.target.value)}
                    placeholder="ระบุสาเหตุ เช่น มีภารกิจพิเศษ, ได้รับมอบหมายเพิ่มเติม..."
                    rows={3}
                    className="form-input text-sm resize-none w-full"
                  />
                  {!earlyReason.trim() && (
                    <p className="text-xs text-red-500 mt-1">* จำเป็นต้องระบุสาเหตุ</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-3">
                <button onClick={retake} className="btn-secondary flex-1">
                  ถ่ายใหม่
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={isEarly && !earlyReason.trim()}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ยืนยันเช็กอิน
                </button>
              </div>
            </>
          )}

          {/* กำลังอัปโหลด */}
          {phase === "uploading" && (
            <div className="text-center py-10">
              <div className="animate-spin h-12 w-12 border-4 border-brand-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">กำลังบันทึกข้อมูล...</p>
            </div>
          )}

          {/* สำเร็จ */}
          {phase === "done" && (
            <div className="text-center py-10">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-9 w-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-green-700 text-lg">เช็กอินสำเร็จ!</p>
              <p className="text-sm mt-1">
                {checkInStatus === "ON_TIME" ? (
                  <span className="badge badge-success">✓ ตรงเวลา</span>
                ) : checkInStatus === "EARLY" ? (
                  <span className="badge badge-info">⏰ เข้าเวรก่อนเวลา</span>
                ) : (
                  <span className="badge badge-warning">⚠ มาสาย</span>
                )}
              </p>
            </div>
          )}

          {/* ข้อผิดพลาด */}
          {phase === "error" && (
            <div className="text-center py-8">
              <div className="h-14 w-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-600 text-sm mb-4">{errorMsg}</p>
              <button onClick={onClose} className="btn-secondary">ปิด</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
