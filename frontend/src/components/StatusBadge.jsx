import React from "react";
import { STATUS_LABELS, STATUS_VARIANTS } from "@/lib/constants";

export default function StatusBadge({ status }) {
  return (
    <span
      data-testid={`status-${status}`}
      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
        STATUS_VARIANTS[status] || "bg-stone-100 text-stone-800 border-stone-300"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
