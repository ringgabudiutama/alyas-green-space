import { query, queryOne } from "@/lib/db";
import { withAuth } from "@/lib/api";
import { todayStr } from "@/lib/dates";

// Export seluruh data pribadi user dalam JSON (tanpa password hash)
export const GET = withAuth(async (_req, user) => {
  const uid = user.uid;
  const [profile, settings, moods, journals, photos, reflections, goals, milestones, savings, transactions, habits, habitLogs, notifications, reviews] =
    await Promise.all([
      queryOne("SELECT id, full_name, email, bio, quote, photo_url, created_at FROM users WHERE id = ?", [uid]),
      queryOne("SELECT * FROM user_settings WHERE user_id = ?", [uid]),
      query("SELECT mood_date, mood FROM moods WHERE user_id = ? ORDER BY mood_date", [uid]),
      query("SELECT * FROM journals WHERE user_id = ? ORDER BY entry_date", [uid]),
      query("SELECT journal_id, url FROM journal_photos WHERE user_id = ?", [uid]),
      query("SELECT * FROM daily_reflections WHERE user_id = ? ORDER BY reflection_date", [uid]),
      query("SELECT * FROM goals WHERE user_id = ?", [uid]),
      query("SELECT m.* FROM goal_milestones m JOIN goals g ON g.id = m.goal_id WHERE g.user_id = ?", [uid]),
      query("SELECT * FROM saving_goals WHERE user_id = ?", [uid]),
      query(
        "SELECT t.*, c.name AS category FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.user_id = ? ORDER BY trx_date",
        [uid]
      ),
      query("SELECT * FROM habits WHERE user_id = ?", [uid]),
      query("SELECT habit_id, log_date, minutes FROM habit_logs WHERE user_id = ? ORDER BY log_date", [uid]),
      query("SELECT type, title, message, is_read, created_at FROM notifications WHERE user_id = ?", [uid]),
      query("SELECT * FROM monthly_reviews WHERE user_id = ?", [uid]),
    ]);
  const data = {
    exported_at: new Date().toISOString(),
    app: "Alya's Green Space — Ciptaan Ringga",
    profile, settings, moods, journals, journal_photos: photos, daily_reflections: reflections, goals, goal_milestones: milestones,
    saving_goals: savings, transactions, habits, habit_logs: habitLogs, notifications, monthly_reviews: reviews,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="alyas-green-space-data-${todayStr()}.json"`,
    },
  });
});
