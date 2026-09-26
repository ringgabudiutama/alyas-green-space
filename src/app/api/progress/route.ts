import { ok, withAuth } from "@/lib/api";
import { addDays, todayStr } from "@/lib/dates";
import { goalsFor, habitsWithStats, journalStreak, progressOverview } from "@/lib/stats";

export const GET = withAuth(async (_req, user) => {
  const today = todayStr();
  const [overview, goals, habits, streak] = await Promise.all([
    progressOverview(user.uid),
    goalsFor(user.uid),
    habitsWithStats(user.uid, addDays(today, -29), today),
    journalStreak(user.uid),
  ]);
  const active = goals.filter((g) => g.computed_status !== "completed");
  return ok({
    ...overview,
    goals: goals.map((g) => ({ id: g.id, title: g.title, progress: g.progress, status: g.computed_status, category: g.category })),
    goalAverage: active.length ? active.reduce((a, g) => a + g.progress, 0) / active.length : 0,
    habits: habits
      .filter((h) => h.is_active)
      .map((h) => ({ id: h.id, name: h.name, icon: h.icon, completionRate: h.completionRate, currentStreak: h.currentStreak, longestStreak: h.longestStreak })),
    streak,
  });
});
