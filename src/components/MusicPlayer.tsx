"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/client";

const SRC = process.env.NEXT_PUBLIC_MUSIC_SRC || "/music/lagu.mp3";
const TITLE = process.env.NEXT_PUBLIC_MUSIC_TITLE || "Lagu untuk Alya";
const PREF_KEY = "ags-music";

function readPref(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}
function writePref(v: "on" | "off") {
  try {
    localStorage.setItem(PREF_KEY, v);
  } catch {
    /* abaikan */
  }
}

/**
 * Musik latar yang otomatis diputar.
 * Browser melarang audio berbunyi sebelum ada interaksi, jadi:
 * 1) coba putar langsung saat halaman terbuka,
 * 2) kalau diblokir, lagu mulai pada sentuhan/klik/ketikan pertama.
 * Diletakkan di root layout → terus berputar saat pindah halaman.
 */
export function MusicPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    const a = new Audio(SRC);
    a.loop = true;
    a.volume = 0.45;
    a.preload = "auto";
    audio.current = a;

    const onErr = () => setAvailable(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("error", onErr);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    const detach = () => events.forEach((ev) => window.removeEventListener(ev, onFirstInteraction));
    function tryPlay() {
      a.play()
        .then(() => {
          detach();
          setShowTitle(true);
          setTimeout(() => setShowTitle(false), 3500);
        })
        .catch(() => {
          /* masih diblokir, tunggu interaksi */
        });
    }
    function onFirstInteraction() {
      if (readPref() === "off") return detach();
      tryPlay();
    }

    if (readPref() !== "off") {
      tryPlay();
      events.forEach((ev) => window.addEventListener(ev, onFirstInteraction, { passive: true }));
    }

    return () => {
      detach();
      a.pause();
      a.removeEventListener("error", onErr);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  if (!available) return null;

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      writePref("on");
      a.play().catch(() => {});
    } else {
      writePref("off");
      a.pause();
    }
  };

  return (
    <div className="fixed left-3 z-[46] flex items-center gap-2 bottom-[calc(env(safe-area-inset-bottom)+var(--wm-offset,0.75rem))]">
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={toggle}
        aria-label={playing ? "Jeda musik" : "Putar musik"}
        title={TITLE}
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] glass text-brand-700 shadow-soft backdrop-blur transition hover:scale-105 dark:text-mint-200"
      >
        <span className={cn("text-lg", playing && "animate-[spin_6s_linear_infinite]")} aria-hidden>
          {playing ? "🎵" : "🔇"}
        </span>
      </button>
      {showTitle && playing && (
        <span className="rounded-full glass px-3 py-1.5 text-xs font-medium text-brand-800 shadow-soft backdrop-blur animate-fade-up dark:text-mint-100">
          ♪ {TITLE}
        </span>
      )}
    </div>
  );
}
