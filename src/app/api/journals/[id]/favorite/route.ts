import { execute, queryOne } from "@/lib/db";
import { idFrom, notFound, ok, withAuth } from "@/lib/api";

export const POST = withAuth(async (_req, user, ctx) => {
  const id = await idFrom(ctx);
  const r = await execute("UPDATE journals SET is_favorite = 1 - is_favorite WHERE id = ? AND user_id = ?", [id, user.uid]);
  if (!r.affectedRows) notFound("Journal");
  const j = await queryOne<{ is_favorite: number }>("SELECT is_favorite FROM journals WHERE id = ?", [id]);
  return ok({ isFavorite: !!j?.is_favorite });
});
