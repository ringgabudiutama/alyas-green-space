"use client";
import { useCallback, useEffect, useState } from "react";

export const THEME_KEY = "ags-theme";

/** Script kecil di <head> agar tema diterapkan sebelum halaman tampil (tanpa kedip) */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function applyTheme(t: "light" | "dark") {
  document.documentElement.classList.toggle("dark", t === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "dark" ? "#0f1d17" : "#f7f5ee");
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* abaikan */
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const set = useCallback((t: "light" | "dark") => {
    applyTheme(t);
    setTheme(t);
    fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: t }) }).catch(() => {});
  }, []);
  return { theme, setTheme: set };
}

/** Sinkronkan tema dari database saat pertama kali login di perangkat baru */
export function ThemeSync({ theme }: { theme: "light" | "dark" | null | undefined }) {
  useEffect(() => {
    if (!theme) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      /* abaikan */
    }
    if (!stored) applyTheme(theme);
  }, [theme]);
  return null;
}
