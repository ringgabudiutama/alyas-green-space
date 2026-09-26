import { execute, query, queryOne, withTransaction } from "@/lib/db";
import { idFrom, notFound, ok, parseBody, withAuth } from "@/lib/api";
import { journalSchema } from "@/lib/validators";
import { afterJournalSaved } from "@/lib/notifications";
import { deleteImage } from "@/lib/storage";

async function ownJournal(id: number, uid: number) {
  const j = await queryOne<Record<string, unknown>>("SELECT * FROM journals WHERE id = ? AND user_id = ?", [id, uid]);
  if (!j) notFound("Journal");
  return j;
}

export const GET = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const j = await ownJournal(id, user.uid);
  const photos = await query<{ id: number; url: string }>("SELECT id, url FROM journal_photos WHERE journal_id = ? ORDER BY id", [id]);
  const reflection = await queryOne(
    "SELECT * FROM daily_reflections WHERE user_id = ? AND (journal_id = ? OR reflection_date = ?) ORDER BY journal_id = ? DESC LIMIT 1",
    [user.uid, id, String(j!.entry_date), id]
  );
  return ok({ ...j, photos, reflection });
});

export const PUT = withAuth(async (req, user, ctx) => {
  const id = await idFrom(ctx);
  await ownJournal(id, user.uid);
  const body = await parseBody(req, journalSchema);
  const old = await query<{ url: string }>("SELECT url FROM journal_photos WHERE journal_id = ?", [id]);
  await withTransaction(async (conn) => {
    await conn.query(
      "UPDATE journals SET title = ?, content = ?, mood = ?, tags = ?, entry_date = ?, is_favorite = COALESCE(?, is_favorite) WHERE id = ? AND user_id = ?",
      [body.title, body.content, body.mood ?? null, body.tags.join(",") || null, body.entryDate, body.isFavorite === undefined ? null : body.isFavorite ? 1 : 0, id, user.uid]
    );
    await conn.query("DELETE FROM journal_photos WHERE journal_id = ?", [id]);
    for (const url of body.photos) {
      await conn.query("INSERT INTO journal_photos (journal_id, user_id, url) VALUES (?,?,?)", [id, user.uid, url]);
    }
  });
  // Hapus file foto yang sudah tidak dipakai
  for (const o of old) if (!body.photos.includes(o.url)) await deleteImage(o.url);
  await afterJournalSaved(user.uid);
  return ok({ id });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  await ownJournal(id, user.uid);
  const photos = await query<{ url: string }>("SELECT url FROM journal_photos WHERE journal_id = ?", [id]);
  await execute("DELETE FROM journals WHERE id = ? AND user_id = ?", [id, user.uid]);
  for (const p of photos) await deleteImage(p.url);
  return ok({ ok: true });
});
