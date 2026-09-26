import { execute } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { savingSchema } from "@/lib/validators";
import { savingGoalsWithProgress } from "@/lib/stats";

export const GET = withAuth(async (_req, user) => {
  const items = await savingGoalsWithProgress(user.uid);
  return ok({
    items,
    totalSaved: items.reduce((a, s) => a + s.current_amount, 0),
    totalTarget: items.reduce((a, s) => a + s.target_amount, 0),
  });
});

export const POST = withAuth(async (req, user) => {
  const b = await parseBody(req, savingSchema);
  const r = await execute(
    "INSERT INTO saving_goals (user_id, title, emoji, target_amount, initial_amount, deadline) VALUES (?,?,?,?,?,?)",
    [user.uid, b.title, b.emoji, b.targetAmount, b.initialAmount, b.deadline ?? null]
  );
  return ok({ id: r.insertId }, 201);
});
