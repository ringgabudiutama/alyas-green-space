import { query } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";
import { currentMonth, isValidMonth, monthRange } from "@/lib/dates";

// GET /api/journals/calendar?month=YYYY-MM → tanggal yang punya journal (indikator hijau)
export const GET = withAuth(async (req, user) => {
  const m = req.nextUrl.searchParams.get("month");
  const month = isValidMonth(m) ? m : currentMonth();
  const [from, to] = monthRange(month);
  const rows = await query<{ d: string; n: number; mood: string | null }>(
    `SELECT entry_date AS d, COUNT(*) AS n, MAX(mood) AS mood FROM journals
     WHERE user_id = ? AND entry_date BETWEEN ? AND ? GROUP BY entry_date`,
    [user.uid, from, to]
  );
  return ok({ month, days: rows.map((r) => ({ date: r.d.slice(0, 10), count: Number(r.n), mood: r.mood })) });
});
