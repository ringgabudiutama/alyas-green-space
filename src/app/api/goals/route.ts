import { withTransaction } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { goalSchema } from "@/lib/validators";
import { goalsFor } from "@/lib/stats";
import type { ResultSetHeader } from "mysql2/promise";

// GET /api/goals?status=in_progress|completed|overdue&category=
export const GET = withAuth(async (req, user) => {
  const status = req.nextUrl.searchParams.get("status");
  const category = req.nextUrl.searchParams.get("category");
  let goals = await goalsFor(user.uid);
  if (status) goals = goals.filter((g) => g.computed_status === status);
  if (category) goals = goals.filter((g) => g.category === category);
  const all = await goalsFor(user.uid);
  return ok({
    items: goals,
    counts: {
      all: all.length,
      in_progress: all.filter((g) => g.computed_status === "in_progress").length,
      completed: all.filter((g) => g.computed_status === "completed").length,
      overdue: all.filter((g) => g.computed_status === "overdue").length,
    },
  });
});

export const POST = withAuth(async (req, user) => {
  const b = await parseBody(req, goalSchema);
  const done = b.status === "completed" || (b.progressMode === "value" && b.currentValue >= b.targetValue);
  const id = await withTransaction(async (conn) => {
    const [r] = await conn.query<ResultSetHeader>(
      `INSERT INTO goals (user_id, title, description, category, target_value, current_value, unit, progress_mode, deadline, priority, status, completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [user.uid, b.title, b.description, b.category, b.targetValue, b.currentValue, b.unit, b.progressMode, b.deadline ?? null, b.priority,
        done ? "completed" : "in_progress", done ? new Date() : null]
    );
    let i = 0;
    for (const m of b.milestones || []) {
      await conn.query("INSERT INTO goal_milestones (goal_id, title, sort_order) VALUES (?,?,?)", [r.insertId, m, i++]);
    }
    return r.insertId;
  });
  return ok({ id }, 201);
});
