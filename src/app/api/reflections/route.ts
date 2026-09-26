import { execute, query, queryOne } from "@/lib/db";
import { HttpError, ok, parseBody, withAuth } from "@/lib/api";
import { reflectionSchema } from "@/lib/validators";
import { isValidYmd, todayStr } from "@/lib/dates";

// GET /api/reflections?date=YYYY-MM-DD  atau  ?limit=30 (riwayat)
export const GET = withAuth(async (req, user) => {
  const date = req.nextUrl.searchParams.get("date");
  if (isValidYmd(date)) {
    const r = await queryOne("SELECT * FROM daily_reflections WHERE user_id = ? AND reflection_date = ?", [user.uid, date]);
    const journal = await queryOne("SELECT id, title FROM journals WHERE user_id = ? AND entry_date = ? ORDER BY id DESC LIMIT 1", [user.uid, date]);
    return ok({ reflection: r, journal });
  }
  const limit = Math.min(90, Number(req.nextUrl.searchParams.get("limit")) || 30);
  const items = await query(
    "SELECT * FROM daily_reflections WHERE user_id = ? ORDER BY reflection_date DESC LIMIT ?",
    [user.uid, limit]
  );
  return ok({ items });
});

// POST → upsert refleksi untuk tanggal tersebut
export const POST = withAuth(async (req, user) => {
  const b = await parseBody(req, reflectionSchema);
  if (b.date > todayStr()) throw new HttpError(400, "Refleksi tidak bisa untuk tanggal di masa depan.");
  let journalId = b.journalId ?? null;
  if (journalId) {
    const own = await queryOne("SELECT id FROM journals WHERE id = ? AND user_id = ?", [journalId, user.uid]);
    if (!own) journalId = null;
  } else {
    const j = await queryOne<{ id: number }>("SELECT id FROM journals WHERE user_id = ? AND entry_date = ? ORDER BY id DESC LIMIT 1", [user.uid, b.date]);
    journalId = j?.id ?? null;
  }
  await execute(
    `INSERT INTO daily_reflections (user_id, reflection_date, happy_moment, lesson, improvement, rating, journal_id)
     VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE happy_moment = VALUES(happy_moment), lesson = VALUES(lesson),
       improvement = VALUES(improvement), rating = VALUES(rating), journal_id = VALUES(journal_id)`,
    [user.uid, b.date, b.happyMoment, b.lesson, b.improvement, b.rating ?? null, journalId]
  );
  return ok({ ok: true });
});
