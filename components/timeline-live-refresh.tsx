"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TimelineLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const activeSlot =
      document.querySelector<HTMLElement>("[data-slot-status='running_now']") ??
      document.querySelector<HTMLElement>("[data-slot-status='upcoming']");

    if (!activeSlot) return;
    activeSlot.scrollIntoView({ block: "center", behavior: "auto" });
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startRefreshLoop = () => {
      if (intervalId) return;
      intervalId = setInterval(() => router.refresh(), 30_000);
    };

    const stopRefreshLoop = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") startRefreshLoop();
      else stopRefreshLoop();
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopRefreshLoop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
