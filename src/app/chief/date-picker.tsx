"use client";

import { useRouter } from "next/navigation";

export function DatePicker({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={currentDate}
      onChange={(e) => {
        if (e.target.value) router.push(`/chief?date=${e.target.value}`);
      }}
      className="form-input text-sm w-auto"
    />
  );
}
