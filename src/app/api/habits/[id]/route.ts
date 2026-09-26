import { execute } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { habitSchema } from "@/lib/validators";

export const PUT = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const b = await parseBody(req, habitSchema);
  const r = await execute(
    "UPDATE habits SET name = ?, category = ?, icon = ?, target_minutes = ?, is_active = ? WHERE id = ? AND user_id = ?",
    [b.name, b.category, b.icon, b.targetMinutes ?? null, b.isActive === false ? 0 : 1, id, user.uid]
  );
  if (!r.affectedRows) notFound("Habit");
  return ok({ ok: true });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const r = await execute("DELETE FROM habits WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!r.affectedRows) notFound("Habit");
  return ok({ ok: true });
});
