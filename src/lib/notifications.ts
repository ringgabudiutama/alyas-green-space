import "server-only";
import { execute, query, queryOne } from "./db";
import { addMonths, currentMonth, formatMonth, hourNow, monthRange, todayStr } from "./dates";
import { STREAK_MILESTONES, computeStreak } from "./streak";
import { journalStreak, financeTotals } from "./stats";
import { rupiah } from "./format";

type NotifType = "lumi" | "journal_reminder" | "goal_progress" | "habit_reminder" | "finance_summary" | "goal_completed" | "streak";

export async function notify(
  uid: number,
  n: { type: NotifType; title: string; message: string; link?: string | null; dedupKey?: string | null }
) {
  // INSERT IGNORE + unique(user_id, dedup_key) => notifikasi yang sama tidak dibuat dua kali
  await execute(
    "INSERT IGNORE INTO notifications (user_id, type, title, message, link, dedup_key) VALUES (?,?,?,?,?,?)",
    [uid, n.type, n.title, n.message, n.link ?? null, n.dedupKey ?? null]
  );
}

async function settingsOf(uid: number) {
  const s = await queryOne<{ notify_journal: number; notify_goal: number; notify_habit: number; notify_finance: number; monthly_budget: number }>(
    "SELECT notify_journal, notify_goal, notify_habit, notify_finance, monthly_budget FROM user_settings WHERE user_id = ?",
    [uid]
  );
  return {
    journal: s ? !!s.notify_journal : true,
    goal: s ? !!s.notify_goal : true,
    habit: s ? !!s.notify_habit : true,
    finance: s ? !!s.notify_finance : true,
    budget: Number(s?.monthly_budget || 0),
  };
}

/** Dipanggil setelah journal dibuat/diubah: cek pencapaian streak */
export async function afterJournalSaved(uid: number) {
  const s = await journalStreak(uid);
  if (s.current > 0 && STREAK_MILESTONES.includes(s.current) && s.currentStart) {
    await notify(uid, {
      type: "streak",
      title: "🤖 Lumi",
      message: `Your journal streak is now ${s.current} days 🔥`,
      link: "/journal",
      dedupKey: `jstreak-${s.currentStart}-${s.current}`,
    });
  }
  return s;
}

/** Dipanggil setelah progress goal berubah */
export async function afterGoalProgress(
  uid: number,
  goal: { id: number; title: string },
  before: number,
  after: number,
  completed: boolean
) {
  const st = await settingsOf(uid);
  if (completed) {
    await notify(uid, {
      type: "goal_completed",
      title: "🎉 Goal Completed",
      message: `You did it, Alya! "${goal.title}" is complete. Another goal completed.`,
      link: "/goals",
      dedupKey: `goal-done-${goal.id}`,
    });
    return;
  }
  if (st.goal && before < 80 && after >= 80) {
    await notify(uid, {
      type: "goal_progress",
      title: "🎯 Goal Progress",
      message: `You completed ${Math.round(after)}% of "${goal.title}". Almost there!`,
      link: "/goals",
      dedupKey: `goal-80-${goal.id}`,
    });
  }
}

export async function afterSavingProgress(uid: number, s: { id: number; title: string; progress: number }) {
  if (s.progress >= 100) {
    await notify(uid, {
      type: "goal_completed",
      title: "🎉 Saving Goal Reached",
      message: `Your saving goal "${s.title}" has reached its target!`,
      link: "/savings",
      dedupKey: `saving-done-${s.id}`,
    });
  }
}

export async function afterHabitLogged(uid: number, habit: { id: number; name: string }) {
  const rows = await query<{ d: string }>("SELECT log_date AS d FROM habit_logs WHERE habit_id = ?", [habit.id]);
  const s = computeStreak(rows.map((r) => r.d.slice(0, 10)), todayStr());
  if (s.current >= 7 && STREAK_MILESTONES.includes(s.current) && s.currentStart) {
    await notify(uid, {
      type: "streak",
      title: "🔥 Habit Streak",
      message: `${habit.name}: ${s.current} days in a row!`,
      link: "/habits",
      dedupKey: `hstreak-${habit.id}-${s.currentStart}-${s.current}`,
    });
  }
}

/**
 * Pengecekan harian — dipanggil saat dashboard / lonceng notifikasi dibuka.
 * Semua memakai dedup_key berbasis tanggal sehingga aman dipanggil berulang.
 */
export async function runDailyChecks(uid: number) {
  const today = todayStr();
  const hour = hourNow();
  const st = await settingsOf(uid);

  if (st.journal && hour >= 18) {
    const j = await queryOne("SELECT id FROM journals WHERE user_id = ? AND entry_date = ? LIMIT 1", [uid, today]);
    if (!j)
      await notify(uid, {
        type: "journal_reminder",
        title: "📝 Journal Reminder",
        message: "You haven't written today's journal yet.",
        link: "/journal/new",
        dedupKey: `jrem-${today}`,
      });
  }

  if (st.habit && hour >= 19) {
    const r = await queryOne<{ pending: number }>(
      `SELECT COUNT(*) AS pending FROM habits h
       WHERE h.user_id = ? AND h.is_active = 1
         AND NOT EXISTS (SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.log_date = ?)`,
      [uid, today]
    );
    const pending = Number(r?.pending || 0);
    if (pending > 0)
      await notify(uid, {
        type: "habit_reminder",
        title: "🌱 Habit Reminder",
        message: `${pending} habit${pending > 1 ? "s" : ""} left for today. Small steps count!`,
        link: "/habits",
        dedupKey: `hrem-${today}`,
      });
  }

  if (st.goal) {
    const overdue = await query<{ id: number; title: string }>(
      "SELECT id, title FROM goals WHERE user_id = ? AND status = 'in_progress' AND deadline IS NOT NULL AND deadline < ?",
      [uid, today]
    );
    for (const g of overdue) {
      await notify(uid, {
        type: "goal_progress",
        title: "🎯 Goal Deadline",
        message: `"${g.title}" has passed its deadline. You can update the deadline or keep going at your pace.`,
        link: "/goals",
        dedupKey: `goal-overdue-${g.id}`,
      });
    }
  }

  if (st.finance) {
    // Ringkasan bulan lalu (muncul sekali di awal bulan)
    const prev = addMonths(currentMonth(), -1);
    const [pf, pt] = monthRange(prev);
    const t = await financeTotals(uid, pf, pt);
    if (t.income > 0 || t.expense > 0) {
      await notify(uid, {
        type: "finance_summary",
        title: "💰 Financial Summary",
        message: `${formatMonth(prev)}: income ${rupiah(t.income)}, expense ${rupiah(t.expense)}, saving ${rupiah(t.saving)}.`,
        link: "/finance",
        dedupKey: `fsum-${prev}`,
      });
    }
    // Budget 80%
    if (st.budget > 0) {
      const [mf, mt] = monthRange(currentMonth());
      const m = await financeTotals(uid, mf, mt);
      const used = (m.expense / st.budget) * 100;
      if (used >= 80)
        await notify(uid, {
          type: "finance_summary",
          title: "💰 Budget Update",
          message: `This month's expense has reached ${Math.round(used)}% of your monthly budget.`,
          link: "/finance",
          dedupKey: `budget80-${currentMonth()}`,
        });
    }
  }
}

export async function unreadCount(uid: number) {
  const r = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0", [uid]);
  return Number(r?.n || 0);
}
