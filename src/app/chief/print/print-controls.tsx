"use client";

export function PrintControls() {
  return (
    <div className="print:hidden fixed bottom-6 right-6 flex gap-3 z-50">
      <button
        onClick={() => window.close()}
        className="btn-secondary text-sm shadow-lg"
      >
        ✕ ปิด
      </button>
      <button
        onClick={() => window.print()}
        className="btn-primary text-sm shadow-lg"
      >
        🖨️ พิมพ์
      </button>
    </div>
  );
}
