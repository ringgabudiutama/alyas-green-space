import { execute } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { habitSchema } from "@/lib/validators";
import { addDays, isValidYmd, todayStr } from "@/lib/dates";
import { habitsWithStats } from "@/lib/stats";

// GET /api/habits?from=&to=   (default: 14 hari terakhir)
export const GET = withAuth(async (req, user) => {
  const today = todayStr();
  const f = req.nextUrl.searchParams.get("from");
  const t = req.nextUrl.searchParams.get("to");
  const to = isValidYmd(t) ? t : today;
  const from = isValidYmd(f) ? f : addDays(to, -13);
  const items = await habitsWithStats(user.uid, from, to);
  return ok({ from, to, today, items });
});

export const POST = withAuth(async (req, user) => {
  const b = await parseBody(req, habitSchema);
  const r = await execute(
    "INSERT INTO habits (user_id, name, category, icon, target_minutes, is_active) VALUES (?,?,?,?,?,?)",
    [user.uid, b.name, b.category, b.icon, b.targetMinutes ?? null, b.isActive === false ? 0 : 1]
  );
  return ok({ id: r.insertId }, 201);
});
