// Logika pesan Lumi. Bukan AI — respons disusun dari data Alya.
import type { DayPeriod } from "./dates";
import type { MoodKey } from "./format";

export type LumiExpression = "happy" | "calm" | "excited" | "encouraging" | "thinking" | "celebrating";
export type LumiMessage = { expression: LumiExpression; message: string };

export function lumiGreeting(period: DayPeriod, name = "Alya"): LumiMessage {
  if (period === "morning") return { expression: "happy", message: `Good morning, ${name}! ☀️ How are you feeling today?` };
  if (period === "afternoon") return { expression: "calm", message: `Hi, ${name}! How's your day going?` };
  return { expression: "calm", message: `Good evening, ${name} 🌙. Before you end your day, let's reflect for a moment.` };
}

export function greetingTitle(period: DayPeriod, name = "Alya") {
  if (period === "morning") return { title: `Good Morning, ${name} ☀️`, sub: "Ready for a gentle start?" };
  if (period === "afternoon") return { title: `Good Afternoon, ${name} 🌿`, sub: "How's your day going?" };
  return { title: `Good Evening, ${name} 🌙`, sub: "How was your day?" };
}

export function lumiMoodResponse(mood: MoodKey, name = "Alya"): LumiMessage {
  switch (mood) {
    case "happy":
      return { expression: "excited", message: `Senang melihatmu hari ini, ${name}! 🌱 Yuk, lihat apa yang sudah kamu capai.` };
    case "calm":
      return { expression: "calm", message: `A calm heart is a beautiful thing, ${name}. Let's keep today gentle and steady. 🍃` };
    case "okay":
      return { expression: "encouraging", message: `Okay is okay, ${name}. Mungkin satu langkah kecil hari ini bisa bikin harimu lebih baik. 🌿` };
    case "sad":
      return { expression: "calm", message: `It's okay, ${name}. You don't have to have a perfect day. Let's take it one step at a time. 🫶` };
    case "stressed":
      return { expression: "encouraging", message: `Tarik napas pelan-pelan dulu, ${name}. Kita kerjakan satu hal kecil saja dulu, ya. You're doing your best. 💚` };
  }
}

export type LumiContext = {
  hasJournalToday: boolean;
  journalStreak: number;
  nearlyDoneGoal?: { title: string; progress: number } | null;
  completedGoalToday?: { title: string } | null;
  mood?: MoodKey | null;
  habitsLeft: number;
  period: DayPeriod;
};

/** Pesan kartu Lumi di dashboard — dipilih berdasarkan kondisi data dengan prioritas */
export function lumiDashboardMessage(c: LumiContext, name = "Alya"): LumiMessage {
  if (c.completedGoalToday)
    return { expression: "celebrating", message: `You did it, ${name}! 🎉 "${c.completedGoalToday.title}" is complete. Another goal completed.` };
  if (c.mood === "sad" || c.mood === "stressed")
    return { expression: "calm", message: `Hari ini boleh pelan-pelan, ${name}. Aku di sini kalau kamu mau cerita lewat journal. 🫶` };
  if (c.journalStreak >= 3 && c.hasJournalToday)
    return { expression: "excited", message: `Your journal streak is now ${c.journalStreak} days! 🔥 You've been showing up for yourself.` };
  if (c.nearlyDoneGoal)
    return {
      expression: "encouraging",
      message: `${name}, you're almost there! Tinggal sedikit lagi untuk menyelesaikan "${c.nearlyDoneGoal.title}" (${Math.round(c.nearlyDoneGoal.progress)}%). 🌱`,
    };
  if (!c.hasJournalToday)
    return { expression: "thinking", message: `I haven't heard from you today, ${name}. Want to tell me about your day?` };
  if (c.habitsLeft > 0)
    return { expression: "encouraging", message: `${c.habitsLeft} habit lagi untuk hari ini. Small steps still count, ${name}! 🌿` };
  if (c.period === "evening")
    return { expression: "calm", message: `Everything's done for today. Rest well, ${name} 🌙` };
  return { expression: "happy", message: `Everything looks lovely today, ${name}. A little progress, every day. 🌱` };
}

export const monthClosing = (name = "Alya") => `You did more than you think, ${name}.`;
