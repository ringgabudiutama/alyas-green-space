import { execute, queryOne } from "@/lib/db";
import { HttpError, idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { habitToggleSchema } from "@/lib/validators";
import { todayStr } from "@/lib/dates";
import { afterHabitLogged } from "@/lib/notifications";

// POST { date } → centang / batal centang habit pada tanggal tersebut
export const POST = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  const h = await queryOne<{ id: number; name: string; target_minutes: number | null }>(
    "SELECT id, name, target_minutes FROM habits WHERE id = ? AND user_id = ?",
    [id, user.uid]
  );
  if (!h) notFound("Habit");
  const b = await parseBody(req, habitToggleSchema);
  if (b.date > todayStr()) throw new HttpError(400, "Tidak bisa mencentang tanggal di masa depan.");

  const existing = await queryOne("SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ?", [id, b.date]);
  if (existing) {
    await execute("DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?", [id, b.date]);
    return ok({ done: false });
  }
  await execute("INSERT INTO habit_logs (habit_id, user_id, log_date, minutes) VALUES (?,?,?,?)", [
    id, user.uid, b.date, b.minutes ?? h.target_minutes ?? null,
  ]);
  await afterHabitLogged(user.uid, h);
  return ok({ done: true });
});
