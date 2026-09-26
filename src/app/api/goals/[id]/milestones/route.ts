import { execute, queryOne } from "@/lib/db";
import { idFrom, ok, parseBody, withAuth } from "@/lib/api";
import { milestoneSchema } from "@/lib/validators";
import { loadGoal, syncGoalCompletion } from "@/lib/goal-service";

export const POST = withAuth(async (req, user, ctx) => {
  const goalId = await idFrom(ctx);
  const before = await loadGoal(goalId, user.uid); // cek kepemilikan
  const b = await parseBody(req, milestoneSchema);
  const max = await queryOne<{ m: number | null }>("SELECT MAX(sort_order) AS m FROM goal_milestones WHERE goal_id = ?", [goalId]);
  const r = await execute("INSERT INTO goal_milestones (goal_id, title, sort_order) VALUES (?,?,?)", [goalId, b.title, Number(max?.m ?? -1) + 1]);
  const result = await syncGoalCompletion(goalId, user.uid, before.progress);
  return ok({ id: r.insertId, ...result }, 201);
});
