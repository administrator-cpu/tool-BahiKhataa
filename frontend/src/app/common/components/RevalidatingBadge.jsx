"use client";

import { useEffect, useState } from "react";

// Only appears if refreshing takes longer than 300 ms, so quick refreshes don't flash.
export default function RevalidatingBadge({ show }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) return undefined;
    const timer = setTimeout(() => setVisible(true), 300);
    return () => {
      clearTimeout(timer);
      setVisible(false);
    };
  }, [show]);
  if (!show || !visible) return null;
  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 rounded-full bg-[#101014] px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      Updating to latest figures…
    </div>
  );
}
