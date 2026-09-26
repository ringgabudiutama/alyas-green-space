import { execute, queryOne } from "@/lib/db";
import { ok, parseBody, withAuth } from "@/lib/api";
import { moodSchema } from "@/lib/validators";
import { todayStr, dayPeriod } from "@/lib/dates";
import { lumiGreeting, lumiMoodResponse } from "@/lib/lumi";
import type { MoodKey } from "@/lib/format";

export const GET = withAuth(async (_req, user) => {
  const r = await queryOne<{ mood: MoodKey }>("SELECT mood FROM moods WHERE user_id = ? AND mood_date = ?", [user.uid, todayStr()]);
  const first = user.name.split(" ")[0] || "Alya";
  return ok({ mood: r?.mood ?? null, greeting: lumiGreeting(dayPeriod(), first), period: dayPeriod() });
});

export const POST = withAuth(async (req, user) => {
  const body = await parseBody(req, moodSchema);
  const date = body.date && body.date <= todayStr() ? body.date : todayStr();
  await execute(
    "INSERT INTO moods (user_id, mood_date, mood) VALUES (?,?,?) ON DUPLICATE KEY UPDATE mood = VALUES(mood)",
    [user.uid, date, body.mood]
  );
  const first = user.name.split(" ")[0] || "Alya";
  return ok({ mood: body.mood, lumi: lumiMoodResponse(body.mood, first) });
});
