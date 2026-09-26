import { execute, queryOne } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { savingMoveSchema } from "@/lib/validators";
import { SAVING_CATEGORY_ID, savingGoalsWithProgress } from "@/lib/stats";
import { afterSavingProgress } from "@/lib/notifications";

// Setor / tarik tabungan → tercatat sebagai transaksi kategori "Saving" yang terhubung ke saving goal
export const POST = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const own = await queryOne<{ title: string }>("SELECT title FROM saving_goals WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!own) notFound("Saving goal");
  const b = await parseBody(req, savingMoveSchema);
  await execute(
    "INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date, saving_goal_id) VALUES (?,?,?,?,?,?,?)",
    [
      user.uid,
      b.direction === "deposit" ? "expense" : "income",
      SAVING_CATEGORY_ID,
      b.amount,
      b.description || `${b.direction === "deposit" ? "Setor" : "Tarik"} tabungan: ${own.title}`,
      b.date,
      id,
    ]
  );
  const s = (await savingGoalsWithProgress(user.uid)).find((x) => x.id === id);
  if (s) await afterSavingProgress(user.uid, s);
  return ok({ saving: s }, 201);
});
