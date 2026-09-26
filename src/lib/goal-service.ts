import "server-only";
import { execute, queryOne } from "./db";
import { notFound } from "./api";
import { GOAL_SELECT, decorateGoal, type GoalRow } from "./goals";
import { todayStr } from "./dates";
import { afterGoalProgress } from "./notifications";

export async function loadGoal(id: number, uid: number) {
  const g = await queryOne<GoalRow>(`${GOAL_SELECT} WHERE g.id = ? AND g.user_id = ?`, [id, uid]);
  if (!g) notFound("Goal");
  return decorateGoal(g, todayStr());
}

/** Setelah perubahan: tandai selesai otomatis jika progress 100% & kirim notifikasi */
export async function syncGoalCompletion(id: number, uid: number, before: number) {
  let g = await loadGoal(id, uid);
  const reached =
    g.status !== "completed" &&
    ((g.progress_mode === "value" && Number(g.current_value) >= Number(g.target_value)) ||
      (g.progress_mode === "milestones" && g.milestones_total > 0 && g.milestones_done === g.milestones_total));
  if (reached) {
    await execute("UPDATE goals SET status = 'completed', completed_at = NOW() WHERE id = ? AND user_id = ?", [id, uid]);
    g = await loadGoal(id, uid);
  }
  const justCompleted = g.status === "completed" && before < 100;
  await afterGoalProgress(uid, g, before, g.progress, justCompleted);
  return { goal: g, justCompleted };
}
