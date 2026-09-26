import { execute, query } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { goalPatchSchema } from "@/lib/validators";
import { loadGoal, syncGoalCompletion } from "@/lib/goal-service";

export const GET = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const goal = await loadGoal(id, user.uid);
  const milestones = await query("SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY sort_order, id", [id]);
  return ok({ ...goal, milestones });
});

export const PUT = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const before = await loadGoal(id, user.uid);
  const b = await parseBody(req, goalPatchSchema);

  const map: Record<string, unknown> = {
    title: b.title, description: b.description, category: b.category, target_value: b.targetValue,
    current_value: b.currentValue, unit: b.unit, progress_mode: b.progressMode, deadline: b.deadline, priority: b.priority,
  };
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      params.push(val as string | number | null);
    }
  }
  if (b.status === "completed" && before.status !== "completed") sets.push("status = 'completed', completed_at = NOW()");
  if (b.status === "in_progress" && before.status === "completed") sets.push("status = 'in_progress', completed_at = NULL");
  if (sets.length) await execute(`UPDATE goals SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`, [...params, id, user.uid]);

  const result = b.status === "in_progress" ? { goal: await loadGoal(id, user.uid), justCompleted: false } : await syncGoalCompletion(id, user.uid, before.progress);
  return ok(result);
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const r = await execute("DELETE FROM goals WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!r.affectedRows) notFound("Goal");
  return ok({ ok: true });
});
