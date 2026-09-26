import { execute, query, withTransaction } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { journalSchema } from "@/lib/validators";
import { isValidMonth, isValidYmd, monthRange, todayStr } from "@/lib/dates";
import { afterJournalSaved } from "@/lib/notifications";
import { computeStreak } from "@/lib/streak";
import type { ResultSetHeader } from "mysql2/promise";

type JournalRow = {
  id: number; title: string; content: string; mood: string | null; tags: string | null;
  entry_date: string; is_favorite: number; created_at: string; updated_at: string; photos: string | null;
};

// GET /api/journals?q=&mood=&tag=&favorite=1&from=&to=&month=YYYY-MM&date=YYYY-MM-DD&page=1
export const GET = withAuth(async (req, user) => {
  const sp = req.nextUrl.searchParams;
  const where: string[] = ["j.user_id = ?"];
  const params: (string | number)[] = [user.uid];

  const q = sp.get("q")?.trim();
  if (q) {
    where.push("(j.title LIKE ? OR j.content LIKE ? OR j.tags LIKE ?)");
    const like = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    params.push(like, like, like);
  }
  const mood = sp.get("mood");
  if (mood && ["happy", "calm", "okay", "sad", "stressed"].includes(mood)) {
    where.push("j.mood = ?");
    params.push(mood);
  }
  const tag = sp.get("tag")?.trim();
  if (tag) {
    where.push("FIND_IN_SET(?, REPLACE(j.tags, ', ', ',')) > 0");
    params.push(tag);
  }
  if (sp.get("favorite") === "1") where.push("j.is_favorite = 1");
  const date = sp.get("date");
  if (isValidYmd(date)) {
    where.push("j.entry_date = ?");
    params.push(date);
  }
  const month = sp.get("month");
  if (isValidMonth(month)) {
    const [f, t] = monthRange(month);
    where.push("j.entry_date BETWEEN ? AND ?");
    params.push(f, t);
  }
  const from = sp.get("from");
  const to = sp.get("to");
  if (isValidYmd(from)) { where.push("j.entry_date >= ?"); params.push(from); }
  if (isValidYmd(to)) { where.push("j.entry_date <= ?"); params.push(to); }

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 12));

  const rows = await query<JournalRow>(
    `SELECT j.*, (SELECT GROUP_CONCAT(p.url ORDER BY p.id SEPARATOR '|') FROM journal_photos p WHERE p.journal_id = j.id) AS photos
     FROM journals j WHERE ${where.join(" AND ")}
     ORDER BY j.entry_date DESC, j.id DESC LIMIT ? OFFSET ?`,
    [...params, limit + 1, (page - 1) * limit]
  );
  const hasMore = rows.length > limit;

  // Semua tanggal ber-journal (untuk streak & kalender)
  const dates = (await query<{ d: string }>("SELECT DISTINCT entry_date AS d FROM journals WHERE user_id = ?", [user.uid])).map((r) =>
    r.d.slice(0, 10)
  );
  const streak = computeStreak(dates, todayStr());
  const tagsRows = await query<{ tags: string }>("SELECT tags FROM journals WHERE user_id = ? AND tags IS NOT NULL AND tags <> ''", [user.uid]);
  const allTags = [...new Set(tagsRows.flatMap((r) => r.tags.split(",").map((t) => t.trim()).filter(Boolean)))].sort();

  return ok({
    items: rows.slice(0, limit).map((r) => ({ ...r, photos: r.photos ? r.photos.split("|") : [] })),
    hasMore,
    page,
    streak,
    total: dates.length,
    tags: allTags,
  });
});

export const POST = withAuth(async (req, user) => {
  const body = await parseBody(req, journalSchema);
  const id = await withTransaction(async (conn) => {
    const [r] = await conn.query<ResultSetHeader>(
      "INSERT INTO journals (user_id, title, content, mood, tags, entry_date, is_favorite) VALUES (?,?,?,?,?,?,?)",
      [user.uid, body.title, body.content, body.mood ?? null, body.tags.join(",") || null, body.entryDate, body.isFavorite ? 1 : 0]
    );
    for (const url of body.photos) {
      await conn.query("INSERT INTO journal_photos (journal_id, user_id, url) VALUES (?,?,?)", [r.insertId, user.uid, url]);
    }
    return r.insertId;
  });
  // Journal hari ini juga menandai habit kategori "journal" sebagai selesai
  if (body.entryDate === todayStr()) {
    await execute(
      `INSERT IGNORE INTO habit_logs (habit_id, user_id, log_date, minutes)
       SELECT id, user_id, ?, target_minutes FROM habits WHERE user_id = ? AND category = 'journal' AND is_active = 1`,
      [body.entryDate, user.uid]
    );
  }
  const streak = await afterJournalSaved(user.uid);
  return ok({ id, streak }, 201);
});
