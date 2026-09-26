import { HttpError, withAuth } from "@/lib/api";
import { currentMonth, formatDate, formatMonth, isValidMonth, isValidYmd, monthRange, startOfWeek, todayStr } from "@/lib/dates";
import { financeReport, fullReport, goalReport, journalReport } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
  GET /api/reports/pdf?type=journal&range=today|week|month|custom&from=&to=
  GET /api/reports/pdf?type=finance&range=month|year|custom&month=YYYY-MM&year=YYYY&from=&to=
  GET /api/reports/pdf?type=goals&filter=all|completed|active
  GET /api/reports/pdf?type=full&month=YYYY-MM
*/
export const GET = withAuth(async (req, user) => {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const today = todayStr();
  let buf: ArrayBuffer;
  let filename: string;

  const custom = () => {
    const from = sp.get("from"), to = sp.get("to");
    if (!isValidYmd(from) || !isValidYmd(to) || from > to) throw new HttpError(400, "Rentang tanggal custom tidak valid.");
    if (Number(to.slice(0, 4)) - Number(from.slice(0, 4)) > 5) throw new HttpError(400, "Rentang maksimal 5 tahun.");
    return [from, to] as const;
  };

  if (type === "journal") {
    const range = sp.get("range") || "month";
    let from: string, to: string, label: string;
    if (range === "today") [from, to, label] = [today, today, formatDate(today)];
    else if (range === "week") [from, to, label] = [startOfWeek(today), today, "This Week"];
    else if (range === "custom") { [from, to] = custom(); label = "Custom Range"; }
    else { [from, to] = monthRange(currentMonth()); label = formatMonth(currentMonth()); }
    buf = await journalReport(user.uid, from, to, label);
    filename = `journal-report-${from}_${to}.pdf`;
  } else if (type === "finance") {
    const range = sp.get("range") || "month";
    let from: string, to: string, label: string;
    if (range === "year") {
      const y = Number(sp.get("year")) || Number(today.slice(0, 4));
      [from, to, label] = [`${y}-01-01`, `${y}-12-31`, `Year ${y}`];
    } else if (range === "custom") { [from, to] = custom(); label = "Custom Range"; }
    else {
      const m = sp.get("month");
      const month = isValidMonth(m) ? m : currentMonth();
      [from, to] = monthRange(month);
      label = formatMonth(month);
    }
    buf = await financeReport(user.uid, from, to, label);
    filename = `financial-report-${from}_${to}.pdf`;
  } else if (type === "goals") {
    const f = sp.get("filter");
    const filter = f === "completed" || f === "active" ? f : "all";
    buf = await goalReport(user.uid, filter);
    filename = `goal-report-${filter}-${today}.pdf`;
  } else if (type === "full") {
    const m = sp.get("month");
    const month = isValidMonth(m) ? m : currentMonth();
    buf = await fullReport(user.uid, month);
    filename = `personal-life-report-${month}.pdf`;
  } else {
    throw new HttpError(400, "Jenis laporan tidak dikenal.");
  }

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
