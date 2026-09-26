import { execute } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { currentMonth, isValidMonth } from "@/lib/dates";
import { monthlyRecap } from "@/lib/recap";
import { monthlyReviewSchema } from "@/lib/validators";

export const GET = withAuth(async (req, user) => {
  const m = req.nextUrl.searchParams.get("month");
  const month = isValidMonth(m) ? m : currentMonth();
  return ok(await monthlyRecap(user.uid, month, user.name.split(" ")[0] || "Alya"));
});

// PUT → simpan refleksi bulanan (What I learned / proud / improve)
export const PUT = withAuth(async (req, user) => {
  const b = await parseBody(req, monthlyReviewSchema);
  await execute(
    `INSERT INTO monthly_reviews (user_id, month, learned, proud, improve) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE learned = VALUES(learned), proud = VALUES(proud), improve = VALUES(improve)`,
    [user.uid, b.month, b.learned, b.proud, b.improve]
  );
  return ok({ ok: true });
});
