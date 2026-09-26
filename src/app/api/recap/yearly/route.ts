import { ok, withAuth } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { yearlyRecap } from "@/lib/recap";

export const GET = withAuth(async (req, user) => {
  const y = Number(req.nextUrl.searchParams.get("year"));
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : Number(todayStr().slice(0, 4));
  return ok(await yearlyRecap(user.uid, year));
});
