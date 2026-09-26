import "server-only";
import { query, queryOne } from "./db";
import { addDays, addMonths, currentMonth, diffDays, monthRange, startOfWeek, todayStr } from "./dates";
import { computeStreak, completionRate } from "./streak";
import { GOAL_SELECT, decorateGoal, type GoalRow } from "./goals";
import type { MoodKey } from "./format";

export const SAVING_CATEGORY_ID = 12;

// ---------------------------------------------------------------- Journal
export async function journalDates(uid: number, from?: string, to?: string): Promise<string[]> {
  const rows = await query<{ d: string }>(
    `SELECT DISTINCT entry_date AS d FROM journals WHERE user_id = ? ${from ? "AND entry_date BETWEEN ? AND ?" : ""} ORDER BY d`,
    from ? [uid, from, to!] : [uid]
  );
  return rows.map((r) => r.d.slice(0, 10));
}

export async function journalStreak(uid: number) {
  return computeStreak(await journalDates(uid), todayStr());
}

/** Streak terpanjang di dalam sebuah rentang */
export async function longestStreakIn(uid: number, from: string, to: string) {
  const dates = await journalDates(uid, from, to);
  return computeStreak(dates, to).longest;
}

// ---------------------------------------------------------------- Finance
export type FinanceTotals = { income: number; expense: number; saving: number; net: number };

export async function financeTotals(uid: number, from: string, to: string): Promise<FinanceTotals> {
  const r = await queryOne<{ income: number; expense: number; saving: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN t.type='income'  AND c.type<>'saving' THEN t.amount END),0) AS income,
       COALESCE(SUM(CASE WHEN t.type='expense' AND c.type<>'saving' THEN t.amount END),0) AS expense,
       COALESCE(SUM(CASE WHEN c.type='saving' THEN (CASE WHEN t.type='expense' THEN t.amount ELSE -t.amount END) END),0) AS saving
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.trx_date BETWEEN ? AND ?`,
    [uid, from, to]
  );
  const income = Number(r?.income || 0);
  const expense = Number(r?.expense || 0);
  const saving = Number(r?.saving || 0);
  return { income, expense, saving, net: income - expense - saving };
}

export async function expenseByCategory(uid: number, from: string, to: string) {
  const rows = await query<{ name: string; icon: string | null; total: number }>(
    `SELECT c.name, c.icon, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense' AND c.type <> 'saving' AND t.trx_date BETWEEN ? AND ?
     GROUP BY c.id, c.name, c.icon ORDER BY total DESC`,
    [uid, from, to]
  );
  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

export async function monthlySeries(uid: number, fromMonth: string, toMonth: string) {
  const [from] = monthRange(fromMonth);
  const [, to] = monthRange(toMonth);
  const rows = await query<{ ym: string; income: number; expense: number; saving: number }>(
    `SELECT DATE_FORMAT(t.trx_date, '%Y-%m') AS ym,
       COALESCE(SUM(CASE WHEN t.type='income'  AND c.type<>'saving' THEN t.amount END),0) AS income,
       COALESCE(SUM(CASE WHEN t.type='expense' AND c.type<>'saving' THEN t.amount END),0) AS expense,
       COALESCE(SUM(CASE WHEN c.type='saving' THEN (CASE WHEN t.type='expense' THEN t.amount ELSE -t.amount END) END),0) AS saving
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.trx_date BETWEEN ? AND ?
     GROUP BY ym ORDER BY ym`,
    [uid, from, to]
  );
  const map = new Map(rows.map((r) => [r.ym, r]));
  const out: { month: string; income: number; expense: number; saving: number }[] = [];
  for (let m = fromMonth; m <= toMonth; m = addMonths(m, 1)) {
    const r = map.get(m);
    out.push({ month: m, income: Number(r?.income || 0), expense: Number(r?.expense || 0), saving: Number(r?.saving || 0) });
  }
  return out;
}

export async function savingGoalsWithProgress(uid: number) {
  const rows = await query<{
    id: number; title: string; emoji: string | null; target_amount: number; initial_amount: number;
    deadline: string | null; created_at: string; current_amount: number;
  }>(
    `SELECT s.*, s.initial_amount + COALESCE((
        SELECT SUM(CASE WHEN t.type='expense' THEN t.amount ELSE -t.amount END)
        FROM transactions t WHERE t.saving_goal_id = s.id AND t.user_id = s.user_id), 0) AS current_amount
     FROM saving_goals s WHERE s.user_id = ? ORDER BY s.created_at DESC`,
    [uid]
  );
  return rows.map((s) => {
    const current = Number(s.current_amount);
    const target = Number(s.target_amount);
    return { ...s, current_amount: current, target_amount: target, progress: target > 0 ? Math.min(100, (current / target) * 100) : 0 };
  });
}

export async function financeOverview(uid: number) {
  const all = await financeTotals(uid, "1970-01-01", "2999-12-31");
  const savings = await savingGoalsWithProgress(uid);
  const totalSaving = savings.reduce((a, s) => a + s.current_amount, 0);
  const settings = await queryOne<{ monthly_budget: number }>("SELECT monthly_budget FROM user_settings WHERE user_id = ?", [uid]);
  return {
    totalBalance: all.income - all.expense - all.saving,
    totalIncome: all.income,
    totalExpense: all.expense,
    totalSaving,
    monthlyBudget: Number(settings?.monthly_budget || 0),
    savings,
  };
}

/** Insight faktual — tanpa penilaian moral */
export function financeInsights(
  month: FinanceTotals,
  prev: FinanceTotals,
  byCat: { name: string; total: number }[],
  budget: number
): string[] {
  const out: string[] = [];
  if (byCat[0]) out.push(`Your highest spending category this month is ${byCat[0].name}.`);
  if (month.expense > 0 && prev.expense > 0) {
    const diff = ((month.expense - prev.expense) / prev.expense) * 100;
    if (Math.abs(diff) >= 1)
      out.push(`Total expense this month is ${Math.abs(Math.round(diff))}% ${diff > 0 ? "higher" : "lower"} than last month.`);
  }
  if (budget > 0) out.push(`You have used ${Math.round((month.expense / budget) * 100)}% of this month's budget.`);
  if (month.income > 0) out.push(`${Math.round(((month.income - month.expense) / month.income) * 100)}% of this month's income remains after expenses.`);
  if (month.saving > 0) out.push(`You set aside ${Math.round(month.saving).toLocaleString("id-ID")} rupiah into your saving goals this month.`);
  return out;
}

// ---------------------------------------------------------------- Habits
export type HabitRow = {
  id: number; name: string; category: string; icon: string | null; target_minutes: number | null;
  is_active: number; created_at: string;
};

export async function habitsWithStats(uid: number, from: string, to: string) {
  const today = todayStr();
  const habits = await query<HabitRow>("SELECT * FROM habits WHERE user_id = ? ORDER BY is_active DESC, created_at", [uid]);
  const logs = await query<{ habit_id: number; log_date: string; minutes: number | null }>(
    "SELECT habit_id, log_date, minutes FROM habit_logs WHERE user_id = ? AND log_date >= ?",
    [uid, addDays(today, -730)]
  );
  const byHabit = new Map<number, string[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habit_id) || [];
    arr.push(l.log_date.slice(0, 10));
    byHabit.set(l.habit_id, arr);
  }
  return habits.map((h) => {
    const dates = byHabit.get(h.id) || [];
    const s = computeStreak(dates, today);
    const created = h.created_at.slice(0, 10);
    const rateFrom = created > addDays(today, -29) ? created : addDays(today, -29);
    return {
      ...h,
      logs: dates.filter((d) => d >= from && d <= to),
      doneToday: dates.includes(today),
      currentStreak: s.current,
      longestStreak: s.longest,
      completionRate: completionRate(dates, rateFrom, today),
      totalLogs: dates.length,
    };
  });
}

// ---------------------------------------------------------------- Goals
export async function goalsFor(uid: number) {
  const today = todayStr();
  const rows = await query<GoalRow>(`${GOAL_SELECT} WHERE g.user_id = ? ORDER BY g.status = 'completed', g.deadline IS NULL, g.deadline`, [uid]);
  return rows.map((g) => decorateGoal(g, today));
}

// ---------------------------------------------------------------- Mood
export async function todayMood(uid: number): Promise<MoodKey | null> {
  const r = await queryOne<{ mood: MoodKey }>("SELECT mood FROM moods WHERE user_id = ? AND mood_date = ?", [uid, todayStr()]);
  return r?.mood ?? null;
}

export async function moodCounts(uid: number, from: string, to: string) {
  const rows = await query<{ mood: MoodKey; n: number }>(
    `SELECT mood, COUNT(*) AS n FROM (
        SELECT mood FROM moods WHERE user_id = ? AND mood_date BETWEEN ? AND ?
     ) x GROUP BY mood ORDER BY n DESC`,
    [uid, from, to]
  );
  if (rows.length) return rows.map((r) => ({ mood: r.mood, n: Number(r.n) }));
  // fallback ke mood di journal
  const j = await query<{ mood: MoodKey; n: number }>(
    "SELECT mood, COUNT(*) AS n FROM journals WHERE user_id = ? AND mood IS NOT NULL AND entry_date BETWEEN ? AND ? GROUP BY mood ORDER BY n DESC",
    [uid, from, to]
  );
  return j.map((r) => ({ mood: r.mood, n: Number(r.n) }));
}

// ---------------------------------------------------------------- Progress
type DayCompletion = { date: string; journal: boolean; reflection: boolean; habitsDone: number; habitsTotal: number; percent: number };

/** Persentase penyelesaian harian: rata-rata (journal, reflection, habit ratio) */
export async function dailyCompletion(uid: number, from: string, to: string): Promise<DayCompletion[]> {
  const [jd, rd, hl, habits] = await Promise.all([
    journalDates(uid, from, to),
    query<{ d: string }>("SELECT reflection_date AS d FROM daily_reflections WHERE user_id = ? AND reflection_date BETWEEN ? AND ?", [uid, from, to]),
    query<{ d: string; n: number }>("SELECT log_date AS d, COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? GROUP BY log_date", [uid, from, to]),
    query<{ created: string; is_active: number }>("SELECT DATE(created_at) AS created, is_active FROM habits WHERE user_id = ?", [uid]),
  ]);
  const jset = new Set(jd);
  const rset = new Set(rd.map((r) => r.d.slice(0, 10)));
  const hmap = new Map(hl.map((r) => [r.d.slice(0, 10), Number(r.n)]));
  const out: DayCompletion[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const habitsTotal = habits.filter((h) => h.is_active && h.created.slice(0, 10) <= d).length;
    const habitsDone = Math.min(hmap.get(d) || 0, habitsTotal || (hmap.get(d) || 0));
    const parts = [jset.has(d) ? 1 : 0, rset.has(d) ? 1 : 0];
    if (habitsTotal > 0) parts.push(habitsDone / habitsTotal);
    const percent = (parts.reduce((a, b) => a + b, 0) / parts.length) * 100;
    out.push({ date: d, journal: jset.has(d), reflection: rset.has(d), habitsDone, habitsTotal, percent });
  }
  return out;
}

export async function todayProgress(uid: number) {
  const today = todayStr();
  const [journal, reflection, habits, trx, goals] = await Promise.all([
    queryOne("SELECT id FROM journals WHERE user_id = ? AND entry_date = ? LIMIT 1", [uid, today]),
    queryOne("SELECT id FROM daily_reflections WHERE user_id = ? AND reflection_date = ? LIMIT 1", [uid, today]),
    queryOne<{ total: number; done: number }>(
      `SELECT COUNT(*) AS total,
              SUM(EXISTS(SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.log_date = ?)) AS done
       FROM habits h WHERE h.user_id = ? AND h.is_active = 1`,
      [today, uid]
    ),
    queryOne("SELECT id FROM transactions WHERE user_id = ? AND trx_date = ? LIMIT 1", [uid, today]),
    goalsFor(uid),
  ]);
  const active = goals.filter((g) => g.computed_status !== "completed");
  const goalAvg = active.length ? active.reduce((a, g) => a + g.progress, 0) / active.length : goals.length ? 100 : 0;
  const hTotal = Number(habits?.total || 0);
  const hDone = Number(habits?.done || 0);
  const items = [
    { key: "journal", label: "Journal", percent: journal ? 100 : 0, detail: journal ? "Sudah ditulis" : "Belum ditulis", href: "/journal/new" },
    { key: "habits", label: "Habits", percent: hTotal ? (hDone / hTotal) * 100 : 0, detail: `${hDone}/${hTotal} selesai`, href: "/habits" },
    { key: "goals", label: "Goals", percent: goalAvg, detail: `${active.length} goal aktif`, href: "/goals" },
    { key: "finance", label: "Finance", percent: trx ? 100 : 0, detail: trx ? "Sudah dicatat" : "Belum ada catatan", href: "/finance/transactions" },
    { key: "reflection", label: "Daily reflection", percent: reflection ? 100 : 0, detail: reflection ? "Selesai" : "Belum diisi", href: "/reflection" },
  ];
  const overall = items.reduce((a, i) => a + i.percent, 0) / items.length;
  return { items, overall, goals, hasJournalToday: !!journal, hasReflectionToday: !!reflection };
}

export async function progressOverview(uid: number) {
  const today = todayStr();
  const weekStart = startOfWeek(today);
  const [monthStart] = monthRange(currentMonth());
  const last30 = addDays(today, -29);
  const days = await dailyCompletion(uid, [weekStart, monthStart, last30].sort()[0], today);
  const avg = (arr: DayCompletion[]) => (arr.length ? arr.reduce((a, d) => a + d.percent, 0) / arr.length : 0);
  const week = days.filter((d) => d.date >= weekStart);
  const month = days.filter((d) => d.date >= monthStart);
  return {
    today: days.find((d) => d.date === today)?.percent ?? 0,
    weekly: avg(week),
    monthly: avg(month),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return days.find((d) => d.date === date) ?? { date, journal: false, reflection: false, habitsDone: 0, habitsTotal: 0, percent: 0, future: true };
    }),
    last30: days.filter((d) => d.date >= last30),
    daysIntoMonth: diffDays(today, monthStart) + 1,
  };
}
