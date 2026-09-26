// Membuat akun Alya + (opsional) data demo untuk development.
// Pemakaian: npm run db:seed
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config({ path: ".env.local" });
dotenv.config();

const {
  DB_HOST = "127.0.0.1", DB_PORT = "3306", DB_USER = "root", DB_PASSWORD = "",
  DB_NAME = "alyas_green_space", DB_SSL = "false",
  SEED_EMAIL = "alya@greenspace.local", SEED_PASSWORD = "GantiPasswordIni123!",
  SEED_DEMO_DATA = "false", APP_TIMEZONE = "Asia/Jakarta",
} = process.env;

const ssl = DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined;

function ymd(d) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function daysAgo(n) {
  return ymd(new Date(Date.now() - n * 86400000));
}
const pick = (arr, i) => arr[i % arr.length];

async function main() {
  const db = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, ssl, charset: "utf8mb4",
  });

  let [rows] = await db.query("SELECT id FROM users WHERE email = ?", [SEED_EMAIL]);
  let userId;
  if (rows.length) {
    userId = rows[0].id;
    console.log(`ℹ️  User ${SEED_EMAIL} sudah ada (id ${userId}).`);
  } else {
    const hash = await bcrypt.hash(SEED_PASSWORD, 12);
    const [res] = await db.query(
      "INSERT INTO users (full_name, email, password_hash, bio, quote) VALUES (?,?,?,?,?)",
      [
        "Alya Mukhbita Zahirah",
        SEED_EMAIL,
        hash,
        "Sedang belajar tumbuh pelan-pelan, satu hari dalam satu waktu.",
        "A little progress, every day.",
      ]
    );
    userId = res.insertId;
    await db.query("INSERT INTO user_settings (user_id, monthly_budget) VALUES (?, ?)", [userId, 2500000]);
    console.log(`✅ User dibuat: ${SEED_EMAIL} (id ${userId})`);
  }
  await db.query("INSERT IGNORE INTO user_settings (user_id) VALUES (?)", [userId]);

  if (SEED_DEMO_DATA !== "true") {
    console.log("ℹ️  SEED_DEMO_DATA bukan 'true' → data demo dilewati.");
    await db.end();
    return;
  }

  const [[{ c }]] = await db.query("SELECT COUNT(*) c FROM journals WHERE user_id = ?", [userId]);
  if (c > 0) {
    console.log("ℹ️  Data demo sudah ada, dilewati.");
    await db.end();
    return;
  }

  const moods = ["happy", "calm", "okay", "happy", "calm", "sad", "happy", "stressed", "calm", "happy"];
  const titles = [
    "Pagi yang tenang", "Belajar hal baru", "Hari yang agak berat", "Ngopi sama teman",
    "Progress kecil", "Refleksi minggu ini", "Hujan sore", "Presentasi berjalan lancar",
    "Jalan pagi", "Membaca di taman", "Rencana bulan depan", "Hari yang produktif",
  ];

  // Journal 12 hari terakhir (streak aktif) + beberapa hari sebelumnya
  const journalDays = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 18, 22, 27];
  for (let i = 0; i < journalDays.length; i++) {
    const date = daysAgo(journalDays[i]);
    await db.query(
      "INSERT INTO journals (user_id, title, content, mood, tags, entry_date, is_favorite) VALUES (?,?,?,?,?,?,?)",
      [
        userId,
        pick(titles, i),
        "Hari ini aku mencoba lebih sadar dengan apa yang kurasakan. Ada hal kecil yang bikin senang, ada juga yang bikin capek — tapi semuanya bagian dari proses. Besok aku mau lebih pelan-pelan dan tetap konsisten.",
        pick(moods, i),
        pick(["kuliah,self-growth", "keluarga", "teman,weekend", "kesehatan", "belajar,english"], i),
        date,
        i % 5 === 0 ? 1 : 0,
      ]
    );
  }

  // Mood harian
  for (let i = 0; i < 30; i++) {
    await db.query("INSERT IGNORE INTO moods (user_id, mood_date, mood) VALUES (?,?,?)", [userId, daysAgo(i), pick(moods, i + 3)]);
  }

  // Refleksi
  for (let i = 1; i < 8; i++) {
    await db.query(
      "INSERT IGNORE INTO daily_reflections (user_id, reflection_date, happy_moment, lesson, improvement, rating) VALUES (?,?,?,?,?,?)",
      [userId, daysAgo(i), "Ngobrol lama dengan teman dekat.", "Istirahat itu juga bagian dari produktif.", "Tidur lebih awal.", 3 + (i % 3)]
    );
  }

  // Goals
  const goals = [
    ["Learn English", "Latihan speaking & listening tiap hari", "education", 100, 75, "%", 65, "high"],
    ["Baca 12 buku tahun ini", "Satu buku setiap bulan", "personal", 12, 10, "buku", 95, "medium"],
    ["Lari 5K tanpa berhenti", "Latihan 3x seminggu", "health", 5, 2, "km", 40, "medium"],
    ["Selesaikan kursus UI/UX", "Kursus online 8 modul", "career", 8, 8, "modul", -3, "high"],
    ["Rapikan portofolio", "Update CV & portofolio online", "career", 100, 30, "%", -5, "low"],
  ];
  for (const [title, desc, cat, target, current, unit, deadlineDays, priority] of goals) {
    const done = Number(current) >= Number(target);
    const deadline = ymd(new Date(Date.now() + deadlineDays * 86400000));
    const [g] = await db.query(
      `INSERT INTO goals (user_id, title, description, category, target_value, current_value, unit, deadline, priority, status, completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [userId, title, desc, cat, target, current, unit, deadline, priority, done ? "completed" : "in_progress", done ? new Date() : null]
    );
    const ms = ["Tentukan rencana", "Mulai konsisten", "Evaluasi tengah jalan", "Selesaikan"];
    for (let k = 0; k < ms.length; k++) {
      await db.query("INSERT INTO goal_milestones (goal_id, title, is_done, sort_order) VALUES (?,?,?,?)", [
        g.insertId, ms[k], done || k < 2 ? 1 : 0, k,
      ]);
    }
  }

  // Saving goals
  const [s1] = await db.query(
    "INSERT INTO saving_goals (user_id, title, emoji, target_amount, initial_amount, deadline) VALUES (?,?,?,?,?,?)",
    [userId, "New Laptop", "💻", 12000000, 6000000, ymd(new Date(Date.now() + 120 * 86400000))]
  );
  const [s2] = await db.query(
    "INSERT INTO saving_goals (user_id, title, emoji, target_amount, initial_amount, deadline) VALUES (?,?,?,?,?,?)",
    [userId, "Dana Darurat", "🛟", 5000000, 1500000, null]
  );

  // Transaksi 3 bulan terakhir
  const expenses = [
    [1, 35000, "Makan siang"], [2, 20000, "Ojek ke kampus"], [3, 150000, "Buku"], [4, 220000, "Baju"],
    [5, 60000, "Nonton"], [6, 45000, "Vitamin"], [7, 120000, "Pulsa & internet"], [1, 28000, "Kopi & roti"],
  ];
  for (let m = 0; m < 3; m++) {
    const base = m * 30;
    await db.query("INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date) VALUES (?,?,?,?,?,?)",
      [userId, "income", 8, 3000000, "Gaji part-time", daysAgo(base + 1)]);
    await db.query("INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date) VALUES (?,?,?,?,?,?)",
      [userId, "income", 9, 750000 + m * 100000, "Project freelance", daysAgo(base + 12)]);
    for (let i = 0; i < 18; i++) {
      const [cat, amt, desc] = pick(expenses, i + m);
      await db.query("INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date) VALUES (?,?,?,?,?,?)",
        [userId, "expense", cat, amt + (i % 4) * 5000, desc, daysAgo(base + (i % 28))]);
    }
    await db.query("INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date, saving_goal_id) VALUES (?,?,?,?,?,?,?)",
      [userId, "expense", 12, 500000, "Setor tabungan laptop", daysAgo(base + 2), s1.insertId]);
    await db.query("INSERT INTO transactions (user_id, type, category_id, amount, description, trx_date, saving_goal_id) VALUES (?,?,?,?,?,?,?)",
      [userId, "expense", 12, 250000, "Setor dana darurat", daysAgo(base + 3), s2.insertId]);
  }

  // Habits
  const habits = [
    ["Reading", "reading", "📖", 30], ["Exercise", "exercise", "🏃‍♀️", 30], ["Drinking Water", "water", "💧", null],
    ["Study English", "study", "🎧", 45], ["Journal", "journal", "📝", 15], ["Sleep Early", "sleep", "🌙", null],
  ];
  for (let h = 0; h < habits.length; h++) {
    const [name, cat, icon, mins] = habits[h];
    const [r] = await db.query("INSERT INTO habits (user_id, name, category, icon, target_minutes) VALUES (?,?,?,?,?)", [userId, name, cat, icon, mins]);
    for (let d = 1; d < 35; d++) {
      if ((d + h) % 3 !== 0 || d < 4) {
        await db.query("INSERT IGNORE INTO habit_logs (habit_id, user_id, log_date, minutes) VALUES (?,?,?,?)", [r.insertId, userId, daysAgo(d), mins]);
      }
    }
  }

  await db.query(
    "INSERT INTO notifications (user_id, type, title, message, link, dedup_key) VALUES (?,?,?,?,?,?)",
    [userId, "lumi", "🤖 Lumi", "Welcome to your Green Space, Alya! 🌱", "/dashboard", "welcome"]
  );

  console.log("✅ Data demo berhasil dibuat.");
  await db.end();
}

main().catch((e) => {
  console.error("❌ Seed gagal:", e.message);
  process.exit(1);
});
