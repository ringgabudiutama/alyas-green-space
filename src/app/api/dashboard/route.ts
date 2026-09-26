import { query } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";
import { currentMonth, dayPeriod, monthRange, todayStr } from "@/lib/dates";
import { financeTotals, journalStreak, todayMood, todayProgress, habitsWithStats } from "@/lib/stats";
import { greetingTitle, lumiDashboardMessage, lumiGreeting } from "@/lib/lumi";
import { runDailyChecks, unreadCount } from "@/lib/notifications";

export const GET = withAuth(async (_req, user) => {
  const uid = user.uid;
  const today = todayStr();
  const period = dayPeriod();
  const first = user.name.split(" ")[0] || "Alya";

  await runDailyChecks(uid).catch((e) => console.error("dailyChecks", e));

  const [from, to] = monthRange(currentMonth());
  const [progress, streak, month, mood, recentJournals, habits, unread] = await Promise.all([
    todayProgress(uid),
    journalStreak(uid),
    financeTotals(uid, from, to),
    todayMood(uid),
    query("SELECT id, title, mood, entry_date, is_favorite, LEFT(content, 160) AS excerpt FROM journals WHERE user_id = ? ORDER BY entry_date DESC, id DESC LIMIT 3", [uid]),
    habitsWithStats(uid, today, today),
    unreadCount(uid),
  ]);

  const goals = progress.goals;
  const active = goals.filter((g) => g.computed_status !== "completed");
  const completed = goals.filter((g) => g.computed_status === "completed");
  const nearly = active.filter((g) => g.progress >= 80).sort((a, b) => b.progress - a.progress)[0];
  const completedToday = completed.find((g) => g.completed_at && g.completed_at.slice(0, 10) === today);
  const activeHabits = habits.filter((h) => h.is_active);

  const lumi = lumiDashboardMessage(
    {
      hasJournalToday: progress.hasJournalToday,
      journalStreak: streak.current,
      nearlyDoneGoal: nearly ? { title: nearly.title, progress: nearly.progress } : null,
      completedGoalToday: completedToday ? { title: completedToday.title } : null,
      mood,
      habitsLeft: activeHabits.filter((h) => !h.doneToday).length,
      period,
    },
    first
  );

  return ok({
    today,
    period,
    greeting: greetingTitle(period, first),
    lumiGreeting: lumiGreeting(period, first),
    lumi,
    mood,
    progress: { items: progress.items, overall: progress.overall },
    stats: {
      streak: streak.current,
      longestStreak: streak.longest,
      activeGoals: active.length,
      completedGoals: completed.length,
      monthlyIncome: month.income,
      monthlyExpense: month.expense,
      monthlySaving: month.saving,
    },
    upcomingGoals: active.slice(0, 3),
    recentJournals,
    habits: activeHabits.map((h) => ({ id: h.id, name: h.name, icon: h.icon, doneToday: h.doneToday, currentStreak: h.currentStreak })),
    unread,
  });
});
