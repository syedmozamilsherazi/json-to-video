import React from "react";

interface LoadingIndicatorProps {
  label?: string;
  fullHeight?: boolean;
  small?: boolean;
}

export function LoadingIndicator({ label = "Loading...", fullHeight = false, small = false }: LoadingIndicatorProps) {
  return (
    <div className={`${fullHeight ? "min-h-[200px]" : ""} w-full flex items-center justify-center py-6`}>
      <div className="flex items-center gap-3 text-[#000000]">
        <div className={`${small ? "h-4 w-4" : "h-6 w-6"} animate-spin rounded-full border-2 border-current border-t-transparent`} />
        <span className={`${small ? "text-sm" : "text-base"}`}>{label}</span>
      </div>
    </div>
  );
}


