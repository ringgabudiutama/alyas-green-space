import { addDays, diffDays } from "./dates";

export type StreakResult = {
  current: number;
  longest: number;
  /** tanggal mulai streak yang sedang berjalan (untuk kunci notifikasi) */
  currentStart: string | null;
};

/**
 * Menghitung streak dari daftar tanggal (YYYY-MM-DD, boleh duplikat / tidak urut).
 * - Streak berjalan tetap dihitung jika hari ini belum diisi tetapi kemarin terisi
 *   (memberi kesempatan sampai akhir hari).
 */
export function computeStreak(dates: string[], today: string): StreakResult {
  const set = new Set(dates.filter((d) => d <= today));
  if (set.size === 0) return { current: 0, longest: 0, currentStart: null };

  // Longest
  const sorted = [...set].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i], sorted[i - 1]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current
  let cursor = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let current = 0;
  let start: string | null = null;
  while (cursor && set.has(cursor)) {
    current += 1;
    start = cursor;
    cursor = addDays(cursor, -1);
  }
  return { current, longest: Math.max(longest, current), currentStart: start };
}

/** Rasio penyelesaian dalam rentang [from, to] */
export function completionRate(dates: string[], from: string, to: string): number {
  const total = diffDays(to, from) + 1;
  if (total <= 0) return 0;
  const inRange = new Set(dates.filter((d) => d >= from && d <= to));
  return (inRange.size / total) * 100;
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
