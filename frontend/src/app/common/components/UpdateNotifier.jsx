"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import Button from "./Button";

// Build this tab was loaded with (inlined at build time)
const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const SNOOZE_MS = 10 * 60 * 1000; // "Later" hides the popup for 10 minutes

/**
 * Detects when a newer frontend version has been deployed.
 * - While the user stays on a page: shows a "new version available" popup.
 * - When the user moves to another screen: reloads so the new version loads.
 */
export default function UpdateNotifier() {
  const pathname = usePathname();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !CURRENT_BUILD_ID) return;

    let stopped = false;
    let intervalId = null;

    const stop = () => {
      stopped = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };

    async function check() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (!stopped && buildId && buildId !== CURRENT_BUILD_ID) {
          setUpdateAvailable(true);
          stop(); // found it; no need to keep polling
        }
      } catch {
        // Offline or deploy in progress: try again on the next tick
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }

    check();
    intervalId = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return stop;
  }, []);

  // User moved to another screen while an update was waiting: load the new version
  useEffect(() => {
    if (updateAvailable && pathname !== lastPathname.current) {
      window.location.reload();
    }
    lastPathname.current = pathname;
  }, [pathname, updateAvailable]);

  const handleLater = () => {
    setIsSnoozed(true);
    setTimeout(() => setIsSnoozed(false), SNOOZE_MS);
  };

  if (!updateAvailable || isSnoozed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-md rounded-2xl border border-[#E7E1D6] bg-[#FFFDF9] p-4 shadow-[0_8px_30px_rgba(16,16,20,0.16)] sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF1EE] text-[#B4301C]">
          <RefreshCw size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#101014]">New version available</p>
          <p className="mt-0.5 text-[12.5px] font-medium text-[#6B6862]">
            Refresh to get the latest updates. Save any unsaved work first.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" icon={RefreshCw} onClick={() => window.location.reload()} className="!px-[14px] !py-[9px] !text-[12.5px]">
              Refresh now
            </Button>
            <Button variant="secondary" onClick={handleLater} className="!px-[14px] !py-[9px] !text-[12.5px]">
              Later
            </Button>
          </div>
        </div>
        <button type="button" onClick={handleLater} title="Dismiss" className="text-[#8A8780] hover:text-[#101014]">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
