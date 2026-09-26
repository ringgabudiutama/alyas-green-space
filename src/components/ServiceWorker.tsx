"use client";
import { useEffect } from "react";

/** Mendaftarkan service worker agar website bisa di-install ke home screen (PWA) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
