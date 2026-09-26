import { ok, withAuth } from "@/lib/api";
import { addMonths, currentMonth, isValidMonth, monthRange } from "@/lib/dates";
import { expenseByCategory, financeInsights, financeOverview, financeTotals, monthlySeries } from "@/lib/stats";
import { query } from "@/lib/db";

// GET /api/finance/summary?month=YYYY-MM
export const GET = withAuth(async (req, user) => {
  const m = req.nextUrl.searchParams.get("month");
  const month = isValidMonth(m) ? m : currentMonth();
  const [from, to] = monthRange(month);
  const prev = addMonths(month, -1);
  const [pf, pt] = monthRange(prev);

  const [overview, totals, prevTotals, byCategory, series, daily] = await Promise.all([
    financeOverview(user.uid),
    financeTotals(user.uid, from, to),
    financeTotals(user.uid, pf, pt),
    expenseByCategory(user.uid, from, to),
    monthlySeries(user.uid, addMonths(month, -5), month),
    query<{ d: string; expense: number }>(
      `SELECT t.trx_date AS d, SUM(t.amount) AS expense FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.type = 'expense' AND c.type <> 'saving' AND t.trx_date BETWEEN ? AND ? GROUP BY t.trx_date ORDER BY d`,
      [user.uid, from, to]
    ),
  ]);

  return ok({
    month,
    overview,
    totals,
    prevTotals,
    byCategory,
    series,
    daily: daily.map((d) => ({ date: d.d.slice(0, 10), expense: Number(d.expense) })),
    budgetUsed: overview.monthlyBudget > 0 ? (totals.expense / overview.monthlyBudget) * 100 : null,
    insights: financeInsights(totals, prevTotals, byCategory, overview.monthlyBudget),
  });
});
