export function rupiah(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? "-" : "";
  return `${sign}Rp${Math.abs(v).toLocaleString("id-ID")}`;
}

/** Rp1,2jt / Rp850rb — untuk label grafik */
export function rupiahShort(n: number): string {
  const v = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (v >= 1_000_000_000) return `${sign}Rp${(v / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000_000) return `${sign}Rp${(v / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")}jt`;
  if (v >= 1_000) return `${sign}Rp${Math.round(v / 1_000)}rb`;
  return `${sign}Rp${v}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function splitTags(tags: string | null | undefined): string[] {
  return (tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "sad", emoji: "😔", label: "Sad" },
  { key: "stressed", emoji: "😫", label: "Stressed" },
] as const;
export type MoodKey = (typeof MOODS)[number]["key"];
export const moodOf = (k: string | null | undefined) => MOODS.find((m) => m.key === k);

export const GOAL_CATEGORIES = [
  { key: "short_term", label: "Short-term" },
  { key: "long_term", label: "Long-term" },
  { key: "personal", label: "Personal" },
  { key: "education", label: "Education" },
  { key: "career", label: "Career" },
  { key: "financial", label: "Financial" },
  { key: "health", label: "Health" },
  { key: "other", label: "Other" },
] as const;
export const goalCategoryLabel = (k: string) => GOAL_CATEGORIES.find((c) => c.key === k)?.label ?? k;

export const HABIT_CATEGORIES = [
  { key: "reading", label: "Reading", icon: "📖" },
  { key: "exercise", label: "Exercise", icon: "🏃‍♀️" },
  { key: "water", label: "Drinking Water", icon: "💧" },
  { key: "study", label: "Study", icon: "🎧" },
  { key: "journal", label: "Journal", icon: "📝" },
  { key: "sleep", label: "Sleep Early", icon: "🌙" },
  { key: "other", label: "Other", icon: "✨" },
] as const;

export const PRIORITIES = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
] as const;
