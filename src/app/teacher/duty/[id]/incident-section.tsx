"use client";

import { useRef, useState, useEffect } from "react";
import { blobPhotoUrl } from "@/lib/photo-url";
import { useRouter } from "next/navigation";

// ===== ประเภทเหตุการณ์ =====
const INCIDENT_TYPES = [
  "พบความสกปรกในพื้นที่",
  "ห้องหรือหน้าต่างไม่ปิด",
  "ไม่ปิดไฟ",
  "พบนักเรียนมั่วสุม",
  "พบนักเรียนทะเลาะวิวาท",
  "พบบุหรี่/อื่นๆ",
] as const;

const INCIDENT_ICONS: Record<string, string> = {
  "พบความสกปรกในพื้นที่": "🗑️",
  "ห้องหรือหน้าต่างไม่ปิด": "🚪",
  "ไม่ปิดไฟ": "💡",
  "พบนักเรียนมั่วสุม": "👥",
  "พบนักเรียนทะเลาะวิวาท": "⚠️",
  "พบบุหรี่/อื่นๆ": "🚬",
};

const MAX_INCIDENTS = 5;

// ===== Types =====
interface IncidentPhoto {
  id: number;
  photoPath: string;
}

export interface Incident {
  id: number;
  incidentType: string;
  description: string;
  reportedAt: string;
  photos: IncidentPhoto[];
}

interface Props {
  assignmentId: number;
  initialIncidents: Incident[];
}

// ===== กล้องถ่ายรูปสำหรับเหตุการณ์ (ภาพไม่บังคับ) =====
function IncidentCameraPanel({
  onCapture,
  onCancel,
}: {
  onCapture: (blob: Blob, preview: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    open();
    return () => stop();
  }, []);

  async function open() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      setError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    // สแตมป์วันเวลาเล็ก ๆ มุมขวาล่าง
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const stamp = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${thaiYear}  ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const fontSize = Math.max(14, Math.floor(canvas.width * 0.018));
    ctx.font = `bold ${fontSize}px Sarabun, Arial, sans-serif`;
    const tw = ctx.measureText(stamp).width;
    const pad = 8;
    const bx = canvas.width - tw - pad * 2 - 6;
    const by = canvas.height - fontSize - pad * 2 - 6;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(bx, by, tw + pad * 2, fontSize + pad * 2, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(stamp, bx + pad, by + pad + fontSize * 0.85);

    stop();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onCapture(blob, url);
        }
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-black border border-gray-200 mt-2">
      {error ? (
        <div className="p-4 text-center text-red-500 text-sm">{error}</div>
      ) : (
        <>
          <div style={{ aspectRatio: "16/9" }} className="relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 p-2 bg-gray-900">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1 text-sm !py-1.5"
            >
              ยกเลิก
            </button>
            <button
              onClick={capture}
              disabled={!ready}
              className="btn-primary flex-1 text-sm !py-1.5"
            >
              📷 ถ่าย
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ===== IncidentSection หลัก =====
export function IncidentSection({ assignmentId, initialIncidents }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [showForm, setShowForm] = useState(false);
  const [incidentType, setIncidentType] = useState("");
  const [description, setDescription] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const router = useRouter();

  const remaining = MAX_INCIDENTS - incidents.length;
  const canAdd = remaining > 0;

  function resetForm() {
    setIncidentType("");
    setDescription("");
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoBlob(null);
    setPhotoPreview(null);
    setShowCamera(false);
    setFormError("");
  }

  function cancelForm() {
    resetForm();
    setShowForm(false);
  }

  async function submit() {
    if (!incidentType) {
      setFormError("กรุณาเลือกประเภทเหตุการณ์");
      return;
    }
    setSubmitting(true);
    setFormError("");

    const fd = new FormData();
    fd.append("assignmentId", String(assignmentId));
    fd.append("incidentType", incidentType);
    fd.append("description", description);
    if (photoBlob) fd.append("photo", photoBlob, "incident.jpg");

    try {
      const res = await fetch("/api/teacher/incidents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");

      setIncidents((prev) => [
        ...prev,
        {
          id: data.incident.id,
          incidentType: data.incident.incidentType,
          description: data.incident.description,
          reportedAt: data.incident.reportedAt,
          photos: data.incident.photos ?? [],
        },
      ]);
      resetForm();
      setShowForm(false);
      router.refresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} น.`;
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500">รายงานเหตุการณ์ผิดปกติ</h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            incidents.length >= MAX_INCIDENTS
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {incidents.length}/{MAX_INCIDENTS}
        </span>
      </div>

      {/* รายการเหตุการณ์ที่บันทึกไว้ */}
      {incidents.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีรายงานเหตุการณ์</p>
      )}

      <div className="space-y-3 mb-4">
        {incidents.map((inc) => (
          <div key={inc.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-start gap-2">
              <span className="text-xl shrink-0">{INCIDENT_ICONS[inc.incidentType] ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{inc.incidentType}</p>
                {inc.description && (
                  <p className="text-sm text-gray-600 mt-0.5">{inc.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">รายงานเมื่อ {formatTime(inc.reportedAt)}</p>
              </div>
            </div>
            {/* รูปภาพประกอบ */}
            {inc.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 ml-8">
                {inc.photos.map((p) => (
                  <a key={p.id} href={blobPhotoUrl(p.photoPath) ?? "#"} target="_blank" rel="noopener noreferrer">
                    <img
                      src={blobPhotoUrl(p.photoPath) ?? ""}
                      alt="รูปเหตุการณ์"
                      className="h-16 w-16 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ฟอร์มเพิ่มเหตุการณ์ */}
      {showForm && (
        <div className="rounded-xl border border-brand-orange-200 bg-brand-orange-50 p-4 space-y-3 mb-4">
          <p className="text-sm font-semibold text-brand-orange-700">เพิ่มรายงานเหตุการณ์</p>

          {/* Dropdown ประเภท */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ประเภทเหตุการณ์ <span className="text-red-500">*</span>
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="form-input text-sm"
            >
              <option value="">— เลือกประเภทเหตุการณ์ —</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INCIDENT_ICONS[t]} {t}
                </option>
              ))}
            </select>
          </div>

          {/* รายละเอียดเพิ่มเติม */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              รายละเอียดเพิ่มเติม
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ตำแหน่ง จำนวน สภาพ..."
              rows={3}
              className="form-input text-sm resize-none"
            />
          </div>

          {/* ถ่ายรูปประกอบ */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              รูปประกอบ (ไม่บังคับ)
            </label>
            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="รูปเหตุการณ์"
                  className="h-28 rounded-lg object-cover border border-gray-200"
                />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(photoPreview);
                    setPhotoPreview(null);
                    setPhotoBlob(null);
                  }}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow"
                >
                  ×
                </button>
              </div>
            ) : showCamera ? (
              <IncidentCameraPanel
                onCapture={(blob, preview) => {
                  setPhotoBlob(blob);
                  setPhotoPreview(preview);
                  setShowCamera(false);
                }}
                onCancel={() => setShowCamera(false)}
              />
            ) : (
              <button
                onClick={() => setShowCamera(true)}
                className="btn-secondary text-sm"
              >
                📷 ถ่ายรูปเหตุการณ์
              </button>
            )}
          </div>

          {/* Error */}
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={cancelForm} className="btn-secondary flex-1 text-sm" disabled={submitting}>
              ยกเลิก
            </button>
            <button onClick={submit} className="btn-primary flex-1 text-sm" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "บันทึกรายงาน"}
            </button>
          </div>
        </div>
      )}

      {/* ปุ่มเพิ่มเหตุการณ์ */}
      {!showForm && canAdd && (
        <button
          onClick={() => setShowForm(true)}
          className="btn-secondary w-full text-sm"
        >
          + เพิ่มรายงานเหตุการณ์ ({remaining} รายการที่เหลือ)
        </button>
      )}
      {!canAdd && (
        <p className="text-xs text-center text-red-500">
          ครบ {MAX_INCIDENTS} รายการแล้ว ไม่สามารถเพิ่มได้อีก
        </p>
      )}
    </div>
  );
}
