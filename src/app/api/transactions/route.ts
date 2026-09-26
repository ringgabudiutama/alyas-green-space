import { execute, query, queryOne } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { transactionSchema } from "@/lib/validators";
import { isValidMonth, isValidYmd, monthRange } from "@/lib/dates";
import { resolveTransactionCategory } from "@/lib/transaction-service";
import { savingGoalsWithProgress } from "@/lib/stats";
import { afterSavingProgress } from "@/lib/notifications";

// GET /api/transactions?q=&type=&categoryId=&from=&to=&month=&page=
export const GET = withAuth(async (req, user) => {
  const sp = req.nextUrl.searchParams;
  const where = ["t.user_id = ?"];
  const params: (string | number)[] = [user.uid];
  const q = sp.get("q")?.trim();
  if (q) {
    where.push("(t.description LIKE ? OR c.name LIKE ?)");
    const like = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    params.push(like, like);
  }
  const type = sp.get("type");
  if (type === "income" || type === "expense") { where.push("t.type = ?"); params.push(type); }
  const cat = Number(sp.get("categoryId"));
  if (Number.isInteger(cat) && cat > 0) { where.push("t.category_id = ?"); params.push(cat); }
  const month = sp.get("month");
  if (isValidMonth(month)) {
    const [f, t] = monthRange(month);
    where.push("t.trx_date BETWEEN ? AND ?");
    params.push(f, t);
  }
  const from = sp.get("from"), to = sp.get("to");
  if (isValidYmd(from)) { where.push("t.trx_date >= ?"); params.push(from); }
  if (isValidYmd(to)) { where.push("t.trx_date <= ?"); params.push(to); }

  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
  const base = `FROM transactions t JOIN categories c ON c.id = t.category_id LEFT JOIN saving_goals s ON s.id = t.saving_goal_id WHERE ${where.join(" AND ")}`;

  const [items, totals] = await Promise.all([
    query(
      `SELECT t.id, t.type, t.category_id, c.name AS category, c.icon, c.type AS category_type, t.amount, t.description, t.trx_date, t.saving_goal_id, s.title AS saving_title
       ${base} ORDER BY t.trx_date DESC, t.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    ),
    queryOne<{ n: number; income: number; expense: number }>(
      `SELECT COUNT(*) AS n,
        COALESCE(SUM(CASE WHEN t.type='income' AND c.type<>'saving' THEN t.amount END),0) AS income,
        COALESCE(SUM(CASE WHEN t.type='expense' AND c.type<>'saving' THEN t.amount END),0) AS expense ${base}`,
      params
    ),
  ]);
  return ok({
    items,
    page,
    total: Number(totals?.n || 0),
    pages: Math.max(1, Math.ceil(Number(totals?.n || 0) / limit)),
    sum: { income: Number(totals?.income || 0), expense: Number(totals?.expense || 0) },
  });
});

export const POST = withAuth(async (req, user) => {
  const b = await parseBody(req, transactionSchema);
  const { categoryId, savingGoalId } = await resolveTransactionCategory(user.uid, b);
  const r = await execute(
    "INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date, saving_goal_id) VALUES (?,?,?,?,?,?,?)",
    [user.uid, b.type, categoryId, b.amount, b.description, b.date, savingGoalId]
  );
  if (savingGoalId) {
    const s = (await savingGoalsWithProgress(user.uid)).find((x) => x.id === savingGoalId);
    if (s) await afterSavingProgress(user.uid, s);
  }
  return ok({ id: r.insertId }, 201);
});
