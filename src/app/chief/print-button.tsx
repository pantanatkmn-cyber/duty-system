"use client";

export function PrintButton({ date }: { date: string }) {
  return (
    <a
      href={`/chief/print?date=${date}`}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary text-sm inline-flex items-center gap-1.5"
    >
      🖨️ พิมพ์ใบรายงาน
    </a>
  );
}
