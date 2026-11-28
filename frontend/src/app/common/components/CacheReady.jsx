"use client";

import { useEffect } from "react";
import { markHydrated } from "@/app/common/lib/swrCache";

// Rendered once in the root layout: after the first hydration, pages may paint from cache.
export default function CacheReady() {
  useEffect(() => { markHydrated(); }, []);
  return null;
}
