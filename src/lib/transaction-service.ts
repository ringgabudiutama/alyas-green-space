import "server-only";
import { queryOne } from "./db";
import { HttpError } from "./api";
import { SAVING_CATEGORY_ID } from "./stats";

/** Validasi kategori & saving goal milik user. Mengembalikan category_id final. */
export async function resolveTransactionCategory(
  uid: number,
  b: { type: "income" | "expense"; categoryId: number; savingGoalId?: number | null }
): Promise<{ categoryId: number; savingGoalId: number | null }> {
  if (b.savingGoalId) {
    const s = await queryOne("SELECT id FROM saving_goals WHERE id = ? AND user_id = ?", [b.savingGoalId, uid]);
    if (!s) throw new HttpError(400, "Saving goal tidak ditemukan.");
    return { categoryId: SAVING_CATEGORY_ID, savingGoalId: b.savingGoalId };
  }
  const c = await queryOne<{ type: string }>("SELECT type FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)", [b.categoryId, uid]);
  if (!c) throw new HttpError(400, "Kategori tidak valid.");
  if (c.type === "saving") throw new HttpError(400, "Pilih saving goal untuk transaksi tabungan.");
  if (c.type !== "both" && c.type !== b.type) throw new HttpError(400, `Kategori ini khusus untuk ${c.type === "income" ? "income" : "expense"}.`);
  return { categoryId: b.categoryId, savingGoalId: null };
}
