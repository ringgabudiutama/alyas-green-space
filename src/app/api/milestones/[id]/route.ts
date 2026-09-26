import { execute, queryOne } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { milestonePatchSchema } from "@/lib/validators";
import { loadGoal, syncGoalCompletion } from "@/lib/goal-service";

async function ownMilestone(id: number, uid: number) {
  const m = await queryOne<{ id: number; goal_id: number }>(
    "SELECT m.id, m.goal_id FROM goal_milestones m JOIN goals g ON g.id = m.goal_id WHERE m.id = ? AND g.user_id = ?",
    [id, uid]
  );
  if (!m) notFound("Milestone");
  return m;
}

export const PATCH = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const m = await ownMilestone(id, user.uid);
  const before = await loadGoal(m.goal_id, user.uid);
  const b = await parseBody(req, milestonePatchSchema);
  if (b.title !== undefined) await execute("UPDATE goal_milestones SET title = ? WHERE id = ?", [b.title, id]);
  if (b.isDone !== undefined)
    await execute("UPDATE goal_milestones SET is_done = ?, done_at = ? WHERE id = ?", [b.isDone ? 1 : 0, b.isDone ? new Date() : null, id]);
  return ok(await syncGoalCompletion(m.goal_id, user.uid, before.progress));
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const m = await ownMilestone(id, user.uid);
  const before = await loadGoal(m.goal_id, user.uid);
  await execute("DELETE FROM goal_milestones WHERE id = ?", [id]);
  return ok(await syncGoalCompletion(m.goal_id, user.uid, before.progress));
});
