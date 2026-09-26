import "server-only";
import { query, queryOne } from "./db";
import { diffDays, monthRange, todayStr } from "./dates";
import { computeStreak } from "./streak";
import { expenseByCategory, financeTotals, journalDates, monthlySeries, moodCounts } from "./stats";
import { monthClosing } from "./lumi";

async function learningMinutes(uid: number, from: string, to: string) {
  const r = await queryOne<{ m: number }>(
    `SELECT COALESCE(SUM(l.minutes),0) AS m FROM habit_logs l JOIN habits h ON h.id = l.habit_id
     WHERE l.user_id = ? AND h.category IN ('study','reading') AND l.log_date BETWEEN ? AND ?`,
    [uid, from, to]
  );
  return Number(r?.m || 0);
}

async function habitCompletion(uid: number, from: string, to: string) {
  const end = to > todayStr() ? todayStr() : to;
  if (end < from) return 0;
  const habits = await query<{ id: number; created: string }>(
    "SELECT id, DATE(created_at) AS created FROM habits WHERE user_id = ? AND is_active = 1",
    [uid]
  );
  let possible = 0;
  for (const h of habits) {
    const start = h.created.slice(0, 10) > from ? h.created.slice(0, 10) : from;
    if (start <= end) possible += diffDays(end, start) + 1;
  }
  const done = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM habit_logs l JOIN habits h ON h.id = l.habit_id WHERE l.user_id = ? AND h.is_active = 1 AND l.log_date BETWEEN ? AND ?",
    [uid, from, end]
  );
  return possible > 0 ? Math.min(100, (Number(done?.n || 0) / possible) * 100) : 0;
}

export async function monthlyRecap(uid: number, month: string, name = "Alya") {
  const [from, to] = monthRange(month);
  const [jCount, goalsDone, dates, fin, moods, learnMin, habitRate, refl, review, byCat] = await Promise.all([
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM journals WHERE user_id = ? AND entry_date BETWEEN ? AND ?", [uid, from, to]),
    query<{ id: number; title: string; completed_at: string }>(
      "SELECT id, title, completed_at FROM goals WHERE user_id = ? AND status = 'completed' AND completed_at BETWEEN ? AND ?",
      [uid, `${from} 00:00:00`, `${to} 23:59:59`]
    ),
    journalDates(uid, from, to),
    financeTotals(uid, from, to),
    moodCounts(uid, from, to),
    learningMinutes(uid, from, to),
    habitCompletion(uid, from, to),
    queryOne<{ n: number; avg: number | null }>(
      "SELECT COUNT(*) AS n, AVG(rating) AS avg FROM daily_reflections WHERE user_id = ? AND reflection_date BETWEEN ? AND ?",
      [uid, from, to]
    ),
    queryOne<{ learned: string | null; proud: string | null; improve: string | null }>(
      "SELECT learned, proud, improve FROM monthly_reviews WHERE user_id = ? AND month = ?",
      [uid, month]
    ),
    expenseByCategory(uid, from, to),
  ]);
  const end = to > todayStr() ? todayStr() : to;
  return {
    month,
    journals: Number(jCount?.n || 0),
    goalsCompleted: goalsDone.length,
    goalsCompletedList: goalsDone,
    longestStreak: computeStreak(dates, end).longest,
    journalDays: dates.length,
    finance: fin,
    topExpense: byCat[0] ?? null,
    byCategory: byCat,
    favoriteMood: moods[0]?.mood ?? null,
    moods,
    learningHours: Math.round((learnMin / 60) * 10) / 10,
    habitCompletion: habitRate,
    reflections: Number(refl?.n || 0),
    avgRating: refl?.avg != null ? Math.round(Number(refl.avg) * 10) / 10 : null,
    review: review ?? { learned: null, proud: null, improve: null },
    closing: monthClosing(name),
  };
}

export async function yearlyRecap(uid: number, year: number) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const end = to > todayStr() ? todayStr() : to;
  const [journalsByMonth, goalsByMonth, dates, fin, series, moods, habitRate, learnMin] = await Promise.all([
    query<{ ym: string; n: number }>(
      "SELECT DATE_FORMAT(entry_date, '%Y-%m') AS ym, COUNT(*) AS n FROM journals WHERE user_id = ? AND entry_date BETWEEN ? AND ? GROUP BY ym",
      [uid, from, to]
    ),
    query<{ ym: string; n: number }>(
      "SELECT DATE_FORMAT(completed_at, '%Y-%m') AS ym, COUNT(*) AS n FROM goals WHERE user_id = ? AND status = 'completed' AND completed_at BETWEEN ? AND ? GROUP BY ym",
      [uid, `${from} 00:00:00`, `${to} 23:59:59`]
    ),
    journalDates(uid, from, to),
    financeTotals(uid, from, to),
    monthlySeries(uid, `${year}-01`, `${year}-12`),
    moodCounts(uid, from, to),
    habitCompletion(uid, from, to),
    learningMinutes(uid, from, to),
  ]);
  const jm = new Map(journalsByMonth.map((r) => [r.ym, Number(r.n)]));
  const gm = new Map(goalsByMonth.map((r) => [r.ym, Number(r.n)]));
  const months = series.map((s) => ({ ...s, journals: jm.get(s.month) || 0, goals: gm.get(s.month) || 0 }));
  return {
    year,
    totalJournals: months.reduce((a, m) => a + m.journals, 0),
    totalGoalsCompleted: months.reduce((a, m) => a + m.goals, 0),
    longestStreak: computeStreak(dates, end).longest,
    finance: fin,
    mostFrequentMood: moods[0]?.mood ?? null,
    moods,
    habitCompletion: habitRate,
    learningHours: Math.round((learnMin / 60) * 10) / 10,
    months,
  };
}
