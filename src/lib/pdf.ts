import "server-only";
import { jsPDF } from "jspdf";
import { query, queryOne } from "./db";
import { formatDate, formatMonth, monthRange, todayStr } from "./dates";
import { rupiah, goalCategoryLabel, moodOf, splitTags } from "./format";
import { expenseByCategory, financeTotals, goalsFor, habitsWithStats, journalStreak, monthlySeries, savingGoalsWithProgress } from "./stats";
import { monthlyRecap } from "./recap";

type RGB = [number, number, number];
const C: Record<string, RGB> = {
  forest: [28, 61, 47],
  brand: [46, 115, 81],
  brandLight: [98, 171, 131],
  sage: [122, 145, 104],
  mint: [230, 246, 238],
  mintDark: [201, 236, 217],
  cream: [248, 244, 234],
  text: [33, 43, 38],
  muted: [110, 120, 114],
  line: [221, 228, 222],
  amber: [201, 138, 26],
  white: [255, 255, 255],
};

/** Font standar PDF hanya mendukung Latin-1 → buang emoji & karakter lain */
function clean(s: unknown): string {
  return String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/·/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

class Report {
  doc: jsPDF;
  y = 20;
  readonly W = 210;
  readonly H = 297;
  readonly M = 18;

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    this.doc.setProperties({ title: "Alya's Green Space Report", author: "Alya's Green Space", creator: "Ciptaan Ringga" });
  }

  get cw() {
    return this.W - this.M * 2;
  }

  color(c: RGB, kind: "text" | "fill" | "draw" = "text") {
    if (kind === "text") this.doc.setTextColor(...c);
    else if (kind === "fill") this.doc.setFillColor(...c);
    else this.doc.setDrawColor(...c);
  }

  leaf(x: number, y: number, r: number) {
    this.color(C.brand, "fill");
    this.doc.circle(x, y, r, "F");
    this.color(C.mint, "fill");
    this.doc.ellipse(x, y, r * 0.35, r * 0.62, "F");
    this.color(C.brand, "draw");
    this.doc.setLineWidth(0.35);
    this.doc.line(x, y - r * 0.55, x, y + r * 0.55);
  }

  cover(o: { name: string; title: string; period: string; tagline?: string; subtitle?: string }) {
    const d = this.doc;
    this.color(C.forest, "fill");
    d.rect(0, 0, this.W, this.H, "F");
    this.color(C.brand, "fill");
    d.circle(this.W - 10, 40, 70, "F");
    this.color([36, 90, 68], "fill");
    d.circle(20, this.H - 20, 60, "F");
    this.leaf(this.M + 8, 40, 8);
    this.color(C.mintDark);
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    d.text("ALYA'S GREEN SPACE", this.M + 20, 42);
    this.color(C.white);
    d.setFontSize(13);
    d.text(clean(o.name).toUpperCase(), this.M, 130);
    d.setFontSize(30);
    d.text(d.splitTextToSize(clean(o.title).toUpperCase(), this.cw) as string[], this.M, 146);
    this.color(C.mintDark);
    d.setFontSize(16);
    d.setFont("helvetica", "normal");
    d.text(clean(o.period).toUpperCase(), this.M, 172);
    if (o.subtitle) {
      d.setFontSize(11);
      d.text(clean(o.subtitle), this.M, 182);
    }
    d.setFont("helvetica", "italic");
    d.setFontSize(13);
    this.color(C.white);
    d.text(`"${clean(o.tagline || "A little progress, every day.")}"`, this.M, 250);
    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    this.color(C.mintDark);
    d.text(`Generated ${formatDate(todayStr())}`, this.M, 262);
    this.newPage();
  }

  newPage() {
    this.doc.addPage();
    this.y = 22;
  }

  ensure(h: number) {
    if (this.y + h > this.H - 22) this.newPage();
  }

  h1(t: string) {
    this.ensure(20);
    const d = this.doc;
    this.leaf(this.M + 3, this.y - 1.5, 3);
    d.setFont("helvetica", "bold");
    d.setFontSize(17);
    this.color(C.forest);
    d.text(clean(t), this.M + 9, this.y);
    this.y += 4;
    this.color(C.line, "draw");
    d.setLineWidth(0.4);
    d.line(this.M, this.y, this.W - this.M, this.y);
    this.y += 8;
  }

  h2(t: string) {
    this.ensure(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.color(C.brand);
    this.doc.text(clean(t), this.M, this.y);
    this.y += 6.5;
  }

  p(t: string, o: { size?: number; color?: RGB; italic?: boolean; indent?: number } = {}) {
    const d = this.doc;
    d.setFont("helvetica", o.italic ? "italic" : "normal");
    d.setFontSize(o.size ?? 10);
    this.color(o.color ?? C.text);
    const lines = d.splitTextToSize(clean(t) || "-", this.cw - (o.indent ?? 0)) as string[];
    const lh = (o.size ?? 10) * 0.45;
    for (const line of lines) {
      this.ensure(lh + 1);
      d.text(line, this.M + (o.indent ?? 0), this.y);
      this.y += lh;
    }
    this.y += 2;
  }

  /** Kartu statistik 3 kolom */
  stats(items: { label: string; value: string }[]) {
    const d = this.doc;
    const cols = 3;
    const gap = 4;
    const w = (this.cw - gap * (cols - 1)) / cols;
    const h = 20;
    for (let i = 0; i < items.length; i += cols) {
      this.ensure(h + 4);
      items.slice(i, i + cols).forEach((it, k) => {
        const x = this.M + k * (w + gap);
        this.color(C.mint, "fill");
        d.roundedRect(x, this.y, w, h, 3, 3, "F");
        d.setFont("helvetica", "normal");
        d.setFontSize(8);
        this.color(C.muted);
        d.text(clean(it.label).toUpperCase(), x + 4, this.y + 7);
        d.setFont("helvetica", "bold");
        d.setFontSize(13);
        this.color(C.forest);
        d.text(clean(it.value), x + 4, this.y + 15);
      });
      this.y += h + 4;
    }
    this.y += 2;
  }

  /** Grafik batang horizontal satu warna (magnitudo), label & nilai tertulis */
  hbars(items: { label: string; value: number }[], fmt: (n: number) => string = (n) => String(n), color: RGB = C.brand) {
    if (!items.length) return this.p("Belum ada data.", { color: C.muted, italic: true });
    const d = this.doc;
    const max = Math.max(...items.map((i) => i.value), 1);
    const labelW = 42;
    const valueW = 32;
    const barW = this.cw - labelW - valueW;
    for (const it of items) {
      this.ensure(8);
      d.setFont("helvetica", "normal");
      d.setFontSize(9);
      this.color(C.text);
      d.text(clean(it.label), this.M, this.y + 3.2);
      this.color(C.cream, "fill");
      d.roundedRect(this.M + labelW, this.y, barW, 4.5, 1.2, 1.2, "F");
      this.color(color, "fill");
      const w = Math.max(1.5, (it.value / max) * barW);
      d.roundedRect(this.M + labelW, this.y, w, 4.5, 1.2, 1.2, "F");
      this.color(C.muted);
      d.text(clean(fmt(it.value)), this.W - this.M, this.y + 3.2, { align: "right" });
      this.y += 7.5;
    }
    this.y += 3;
  }

  /** Grafik batang berkelompok (mis. income vs expense per bulan) */
  groupedBars(labels: string[], series: { name: string; values: number[]; color: RGB }[], fmt: (n: number) => string) {
    const d = this.doc;
    const h = 55;
    this.ensure(h + 16);
    const top = this.y;
    const max = Math.max(1, ...series.flatMap((s) => s.values));
    const groupW = this.cw / labels.length;
    const barW = Math.min(6, (groupW - 4) / series.length);
    this.color(C.line, "draw");
    d.setLineWidth(0.2);
    for (let g = 0; g <= 4; g++) {
      const yy = top + h - (h * g) / 4;
      d.line(this.M, yy, this.W - this.M, yy);
    }
    labels.forEach((lab, i) => {
      const gx = this.M + i * groupW + (groupW - barW * series.length - (series.length - 1) * 0.8) / 2;
      series.forEach((s, k) => {
        const v = s.values[i] || 0;
        const bh = (v / max) * h;
        this.color(s.color, "fill");
        if (bh > 0) d.roundedRect(gx + k * (barW + 0.8), top + h - bh, barW, bh, 0.8, 0.8, "F");
      });
      d.setFontSize(7.5);
      this.color(C.muted);
      d.text(clean(lab), this.M + i * groupW + groupW / 2, top + h + 4.5, { align: "center" });
    });
    d.setFontSize(7);
    d.text(clean(fmt(max)), this.M, top - 1.5);
    // legend
    let lx = this.M;
    const ly = top + h + 10;
    series.forEach((s) => {
      this.color(s.color, "fill");
      d.roundedRect(lx, ly - 2.8, 3.5, 3.5, 0.8, 0.8, "F");
      d.setFontSize(8.5);
      this.color(C.text);
      d.text(clean(s.name), lx + 5, ly);
      lx += d.getTextWidth(clean(s.name)) + 12;
    });
    this.y = ly + 7;
  }

  progress(label: string, pct: number, right: string) {
    const d = this.doc;
    this.ensure(12);
    d.setFont("helvetica", "bold");
    d.setFontSize(9.5);
    this.color(C.text);
    const lab = d.splitTextToSize(clean(label), this.cw - 45)[0] as string;
    d.text(lab, this.M, this.y);
    d.setFont("helvetica", "normal");
    this.color(C.muted);
    d.text(clean(right), this.W - this.M, this.y, { align: "right" });
    this.y += 2.2;
    this.color(C.cream, "fill");
    d.roundedRect(this.M, this.y, this.cw, 3.2, 1.2, 1.2, "F");
    this.color(pct >= 100 ? C.brand : C.brandLight, "fill");
    if (pct > 0) d.roundedRect(this.M, this.y, Math.max(2, (this.cw * Math.min(100, pct)) / 100), 3.2, 1.2, 1.2, "F");
    this.y += 9;
  }

  table(headers: string[], rows: string[][], widths: number[], align: ("left" | "right")[] = []) {
    const d = this.doc;
    const total = widths.reduce((a, b) => a + b, 0);
    const ws = widths.map((w) => (w / total) * this.cw);
    const drawHeader = () => {
      this.color(C.forest, "fill");
      d.roundedRect(this.M, this.y - 4.5, this.cw, 7, 1.5, 1.5, "F");
      d.setFont("helvetica", "bold");
      d.setFontSize(8.5);
      this.color(C.white);
      let x = this.M;
      headers.forEach((h, i) => {
        const al = align[i] || "left";
        d.text(clean(h), al === "right" ? x + ws[i] - 2 : x + 2, this.y, { align: al });
        x += ws[i];
      });
      this.y += 6;
    };
    this.ensure(14);
    drawHeader();
    d.setFont("helvetica", "normal");
    rows.forEach((r, ri) => {
      const cells = r.map((c, i) => d.splitTextToSize(clean(c) || "-", ws[i] - 4) as string[]);
      const lines = Math.max(...cells.map((c) => c.length));
      const rh = lines * 3.8 + 2.4;
      if (this.y + rh > this.H - 22) {
        this.newPage();
        drawHeader();
        d.setFont("helvetica", "normal");
      }
      if (ri % 2 === 0) {
        this.color([246, 250, 247], "fill");
        d.rect(this.M, this.y - 3.6, this.cw, rh, "F");
      }
      d.setFontSize(8.5);
      this.color(C.text);
      let x = this.M;
      cells.forEach((c, i) => {
        const al = align[i] || "left";
        c.forEach((line, li) => d.text(line, al === "right" ? x + ws[i] - 2 : x + 2, this.y + li * 3.8, { align: al }));
        x += ws[i];
      });
      this.y += rh;
    });
    this.y += 4;
  }

  quoteBox(t: string) {
    const d = this.doc;
    d.setFont("helvetica", "italic");
    d.setFontSize(11);
    const lines = d.splitTextToSize(clean(t), this.cw - 16) as string[];
    const h = lines.length * 5 + 10;
    this.ensure(h + 4);
    this.color(C.mint, "fill");
    d.roundedRect(this.M, this.y, this.cw, h, 3, 3, "F");
    this.color(C.brand, "fill");
    d.rect(this.M, this.y, 1.6, h, "F");
    this.color(C.forest);
    lines.forEach((l, i) => d.text(l, this.M + 8, this.y + 8 + i * 5));
    this.y += h + 6;
  }

  finish(): ArrayBuffer {
    const d = this.doc;
    const n = d.getNumberOfPages();
    for (let i = 2; i <= n; i++) {
      d.setPage(i);
      this.color(C.line, "draw");
      d.setLineWidth(0.3);
      d.line(this.M, this.H - 14, this.W - this.M, this.H - 14);
      d.setFont("helvetica", "normal");
      d.setFontSize(8);
      this.color(C.muted);
      d.text("Alya's Green Space  -  Ciptaan Ringga", this.M, this.H - 9);
      d.text(`${i - 1} / ${n - 1}`, this.W - this.M, this.H - 9, { align: "right" });
    }
    // watermark juga di sampul
    d.setPage(1);
    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    this.color(C.mintDark);
    d.text("Ciptaan Ringga", this.W - this.M, this.H - 12, { align: "right" });
    return d.output("arraybuffer");
  }
}

// ======================================================================
type UserInfo = { full_name: string; quote: string | null; bio: string | null };
async function userInfo(uid: number): Promise<UserInfo> {
  return (await queryOne<UserInfo>("SELECT full_name, quote, bio FROM users WHERE id = ?", [uid])) ?? { full_name: "Alya", quote: null, bio: null };
}

type JournalRow = { id: number; title: string; content: string; mood: string | null; tags: string | null; entry_date: string; is_favorite: number };

async function journalSection(r: Report, uid: number, from: string, to: string, withEntries = true) {
  const journals = await query<JournalRow>(
    "SELECT id, title, content, mood, tags, entry_date, is_favorite FROM journals WHERE user_id = ? AND entry_date BETWEEN ? AND ? ORDER BY entry_date, id",
    [uid, from, to]
  );
  const streak = await journalStreak(uid);
  const moodCount = new Map<string, number>();
  journals.forEach((j) => j.mood && moodCount.set(j.mood, (moodCount.get(j.mood) || 0) + 1));
  r.h1("Journal Summary");
  r.stats([
    { label: "Entries", value: String(journals.length) },
    { label: "Favorites", value: String(journals.filter((j) => j.is_favorite).length) },
    { label: "Current streak", value: `${streak.current} days` },
  ]);
  if (moodCount.size) {
    r.h2("Mood in journal");
    r.hbars([...moodCount.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ label: moodOf(m)?.label ?? m, value: n })), (n) => `${n}x`);
  }
  if (withEntries) {
    r.h1("Journal Entries");
    if (!journals.length) r.p("Belum ada journal pada periode ini.", { italic: true, color: C.muted });
    for (const j of journals) {
      r.ensure(24);
      r.h2(`${formatDate(j.entry_date)}  -  ${j.title}`);
      const meta = [j.mood ? `Mood: ${moodOf(j.mood)?.label}` : null, splitTags(j.tags).length ? `Tags: ${splitTags(j.tags).join(", ")}` : null]
        .filter(Boolean)
        .join("   |   ");
      if (meta) r.p(meta, { size: 8.5, color: C.muted });
      r.p(j.content);
      r.y += 2;
    }
  }
}

async function financeSection(r: Report, uid: number, from: string, to: string, seriesMonths?: [string, string]) {
  const [t, byCat, trx] = await Promise.all([
    financeTotals(uid, from, to),
    expenseByCategory(uid, from, to),
    query<{ trx_date: string; type: string; category: string; description: string | null; amount: number }>(
      `SELECT t.trx_date, t.type, c.name AS category, t.description, t.amount FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND t.trx_date BETWEEN ? AND ? ORDER BY t.trx_date, t.id`,
      [uid, from, to]
    ),
  ]);
  r.h1("Finance Summary");
  r.stats([
    { label: "Income", value: rupiah(t.income) },
    { label: "Expense", value: rupiah(t.expense) },
    { label: "Saving", value: rupiah(t.saving) },
    { label: "Net (after saving)", value: rupiah(t.net) },
    { label: "Transactions", value: String(trx.length) },
    { label: "Top category", value: byCat[0]?.name ?? "-" },
  ]);
  if (byCat[0]) r.p(`Your highest spending category in this period is ${byCat[0].name}.`, { italic: true, color: C.muted });
  r.h2("Expense by Category");
  r.hbars(byCat.map((c) => ({ label: c.name, value: c.total })), rupiah);
  if (seriesMonths) {
    const s = await monthlySeries(uid, seriesMonths[0], seriesMonths[1]);
    if (s.length > 1) {
      r.h2("Income vs Expense");
      r.groupedBars(
        s.map((m) => formatMonth(m.month).slice(0, 3)),
        [
          { name: "Income", values: s.map((m) => m.income), color: [31, 122, 85] },
          { name: "Expense", values: s.map((m) => m.expense), color: [201, 138, 26] },
        ],
        rupiah
      );
    }
  }
  const savings = await savingGoalsWithProgress(uid);
  if (savings.length) {
    r.h2("Saving Goals");
    savings.forEach((s) => r.progress(s.title, s.progress, `${rupiah(s.current_amount)} / ${rupiah(s.target_amount)}  (${Math.round(s.progress)}%)`));
  }
  r.h2("Transactions");
  r.table(
    ["Date", "Type", "Category", "Description", "Amount"],
    trx.map((x) => [formatDate(x.trx_date), x.type === "income" ? "Income" : "Expense", x.category, x.description || "-", rupiah(x.amount)]),
    [22, 15, 20, 45, 24],
    ["left", "left", "left", "left", "right"]
  );
}

async function goalSection(r: Report, uid: number, filter: "all" | "completed" | "active") {
  let goals = await goalsFor(uid);
  if (filter === "completed") goals = goals.filter((g) => g.computed_status === "completed");
  if (filter === "active") goals = goals.filter((g) => g.computed_status !== "completed");
  const all = await goalsFor(uid);
  r.h1("Goal Summary");
  r.stats([
    { label: "Total goals", value: String(all.length) },
    { label: "Completed", value: String(all.filter((g) => g.computed_status === "completed").length) },
    { label: "In progress / overdue", value: `${all.filter((g) => g.computed_status === "in_progress").length} / ${all.filter((g) => g.computed_status === "overdue").length}` },
  ]);
  if (!goals.length) r.p("Belum ada goal untuk filter ini.", { italic: true, color: C.muted });
  for (const g of goals) {
    const status = g.computed_status === "completed" ? "Completed" : g.computed_status === "overdue" ? "Overdue" : "In Progress";
    r.progress(`${g.title}  (${goalCategoryLabel(g.category)})`, g.progress, `${Math.round(g.progress)}%  -  ${status}`);
    const meta = [
      g.deadline ? `Deadline: ${formatDate(g.deadline)}` : null,
      `Priority: ${g.priority}`,
      g.progress_mode === "value" ? `${g.current_value} / ${g.target_value} ${g.unit || ""}` : `${g.milestones_done}/${g.milestones_total} milestones`,
    ]
      .filter(Boolean)
      .join("   |   ");
    r.y -= 4;
    r.p(meta, { size: 8, color: C.muted });
    r.y += 1;
  }
}

async function habitSection(r: Report, uid: number, from: string, to: string) {
  const habits = (await habitsWithStats(uid, from, to)).filter((h) => h.is_active);
  r.h1("Habit Summary");
  if (!habits.length) return r.p("Belum ada habit.", { italic: true, color: C.muted });
  r.table(
    ["Habit", "Check-ins (period)", "Current streak", "Longest streak", "Completion (30d)"],
    habits.map((h) => [h.name, String(h.logs.length), `${h.currentStreak} d`, `${h.longestStreak} d`, `${Math.round(h.completionRate)}%`]),
    [34, 22, 20, 20, 22],
    ["left", "right", "right", "right", "right"]
  );
}

// ======================================================================
export async function journalReport(uid: number, from: string, to: string, label: string) {
  const u = await userInfo(uid);
  const r = new Report();
  r.cover({ name: u.full_name, title: "Journal Report", period: label, subtitle: `${formatDate(from)} - ${formatDate(to)}`, tagline: u.quote || undefined });
  await journalSection(r, uid, from, to, true);
  return r.finish();
}

export async function financeReport(uid: number, from: string, to: string, label: string) {
  const u = await userInfo(uid);
  const r = new Report();
  r.cover({ name: u.full_name, title: "Financial Report", period: label, subtitle: `${formatDate(from)} - ${formatDate(to)}` });
  const fm = from.slice(0, 7), tm = to.slice(0, 7);
  await financeSection(r, uid, from, to, fm !== tm ? [fm, tm] : undefined);
  return r.finish();
}

export async function goalReport(uid: number, filter: "all" | "completed" | "active") {
  const u = await userInfo(uid);
  const r = new Report();
  const t = { all: "All Goals", completed: "Completed Goals", active: "Active Goals" }[filter];
  r.cover({ name: u.full_name, title: "Goal Report", period: t, subtitle: formatDate(todayStr()) });
  await goalSection(r, uid, filter);
  return r.finish();
}

export async function fullReport(uid: number, month: string) {
  const u = await userInfo(uid);
  const [from, to] = monthRange(month);
  const first = u.full_name.split(" ")[0] || "Alya";
  const recap = await monthlyRecap(uid, month, first);
  const r = new Report();
  r.cover({ name: u.full_name, title: "Personal Life Report", period: formatMonth(month), tagline: "A little progress, every day." });

  r.h1("Personal Overview");
  if (u.bio) r.p(u.bio, { italic: true, color: C.muted });
  r.stats([
    { label: "Journal entries", value: String(recap.journals) },
    { label: "Goals completed", value: String(recap.goalsCompleted) },
    { label: "Longest streak", value: `${recap.longestStreak} days` },
    { label: "Saving", value: rupiah(recap.finance.saving) },
    { label: "Favorite mood", value: moodOf(recap.favoriteMood)?.label ?? "-" },
    { label: "Learning", value: `${recap.learningHours} hours` },
  ]);
  r.h2("Achievements");
  const ach: string[] = [];
  if (recap.longestStreak >= 7) ach.push(`Journal streak of ${recap.longestStreak} days`);
  recap.goalsCompletedList.forEach((g) => ach.push(`Completed goal: ${g.title}`));
  if (recap.habitCompletion >= 70) ach.push(`Habit completion rate ${Math.round(recap.habitCompletion)}%`);
  if (recap.finance.saving > 0) ach.push(`Saved ${rupiah(recap.finance.saving)} into saving goals`);
  if (recap.reflections > 0) ach.push(`${recap.reflections} daily reflections written`);
  if (!ach.length) ach.push("Every small step this month still counts.");
  ach.forEach((a) => r.p(`-  ${a}`, { indent: 2 }));

  if (recap.moods.length) {
    r.h2("Mood Overview");
    r.hbars(recap.moods.map((m) => ({ label: moodOf(m.mood)?.label ?? m.mood, value: m.n })), (n) => `${n} days`);
  }

  await journalSection(r, uid, from, to, true);
  await goalSection(r, uid, "all");
  await financeSection(r, uid, from, to);
  await habitSection(r, uid, from, to);

  r.h1("Monthly Reflection");
  r.h2("What I learned this month");
  r.p(recap.review.learned || "-");
  r.h2("What I'm proud of");
  r.p(recap.review.proud || "-");
  r.h2("What I want to improve");
  r.p(recap.review.improve || "-");
  const refl = await query<{ reflection_date: string; happy_moment: string | null; lesson: string | null; improvement: string | null; rating: number | null }>(
    "SELECT reflection_date, happy_moment, lesson, improvement, rating FROM daily_reflections WHERE user_id = ? AND reflection_date BETWEEN ? AND ? ORDER BY reflection_date",
    [uid, from, to]
  );
  if (refl.length) {
    r.h2("Daily Reflections");
    r.table(
      ["Date", "Happy moment", "Lesson", "Improve", "Rate"],
      refl.map((x) => [formatDate(x.reflection_date), x.happy_moment || "-", x.lesson || "-", x.improvement || "-", x.rating ? `${x.rating}/5` : "-"]),
      [20, 30, 30, 30, 10],
      ["left", "left", "left", "left", "right"]
    );
  }
  r.quoteBox(`Lumi: "${recap.closing}"`);
  return r.finish();
}
