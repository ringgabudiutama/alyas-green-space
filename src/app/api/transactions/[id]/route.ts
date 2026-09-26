import { execute } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { transactionSchema } from "@/lib/validators";
import { resolveTransactionCategory } from "@/lib/transaction-service";

export const PUT = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const b = await parseBody(req, transactionSchema);
  const { categoryId, savingGoalId } = await resolveTransactionCategory(user.uid, b);
  const r = await execute(
    "UPDATE transactions SET type = ?, category_id = ?, amount = ?, description = ?, trx_date = ?, saving_goal_id = ? WHERE id = ? AND user_id = ?",
    [b.type, categoryId, b.amount, b.description, b.date, savingGoalId, id, user.uid]
  );
  if (!r.affectedRows) notFound("Transaksi");
  return ok({ ok: true });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const r = await execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!r.affectedRows) notFound("Transaksi");
  return ok({ ok: true });
});
