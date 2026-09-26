import { execute, queryOne } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { settingsSchema } from "@/lib/validators";

export const GET = withAuth(async (_req, user) => {
  await execute("INSERT IGNORE INTO user_settings (user_id) VALUES (?)", [user.uid]);
  const s = await queryOne("SELECT theme, notify_journal, notify_goal, notify_habit, notify_finance, monthly_budget FROM user_settings WHERE user_id = ?", [user.uid]);
  return ok({ settings: s });
});

export const PUT = withAuth(async (req, user) => {
  const b = await parseBody(req, settingsSchema);
  await execute("INSERT IGNORE INTO user_settings (user_id) VALUES (?)", [user.uid]);
  const map: Record<string, string | number | undefined> = {
    theme: b.theme,
    notify_journal: b.notifyJournal === undefined ? undefined : Number(b.notifyJournal),
    notify_goal: b.notifyGoal === undefined ? undefined : Number(b.notifyGoal),
    notify_habit: b.notifyHabit === undefined ? undefined : Number(b.notifyHabit),
    notify_finance: b.notifyFinance === undefined ? undefined : Number(b.notifyFinance),
    monthly_budget: b.monthlyBudget,
  };
  const entries = Object.entries(map).filter(([, v]) => v !== undefined) as [string, string | number][];
  if (entries.length) {
    await execute(`UPDATE user_settings SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE user_id = ?`, [
      ...entries.map(([, v]) => v),
      user.uid,
    ]);
  }
  return ok({ ok: true });
});
