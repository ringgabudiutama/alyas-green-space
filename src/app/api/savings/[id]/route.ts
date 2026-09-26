import { execute, query } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { savingSchema } from "@/lib/validators";
import { savingGoalsWithProgress } from "@/lib/stats";
import { afterSavingProgress } from "@/lib/notifications";

export const GET = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const s = (await savingGoalsWithProgress(user.uid)).find((x) => x.id === id);
  if (!s) notFound("Saving goal");
  const history = await query(
    "SELECT id, type, amount, description, trx_date FROM transactions WHERE user_id = ? AND saving_goal_id = ? ORDER BY trx_date DESC, id DESC LIMIT 100",
    [user.uid, id]
  );
  return ok({ ...s, history });
});

export const PUT = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const b = await parseBody(req, savingSchema);
  const r = await execute(
    "UPDATE saving_goals SET title = ?, emoji = ?, target_amount = ?, initial_amount = ?, deadline = ? WHERE id = ? AND user_id = ?",
    [b.title, b.emoji, b.targetAmount, b.initialAmount, b.deadline ?? null, id, user.uid]
  );
  if (!r.affectedRows) notFound("Saving goal");
  const s = (await savingGoalsWithProgress(user.uid)).find((x) => x.id === id);
  if (s) await afterSavingProgress(user.uid, s);
  return ok({ ok: true });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  // Transaksi setoran tetap tersimpan (saving_goal_id otomatis NULL via FK)
  const r = await execute("DELETE FROM saving_goals WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!r.affectedRows) notFound("Saving goal");
  return ok({ ok: true });
});
