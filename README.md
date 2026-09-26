# 🌿 Alya's Green Space

**Journal · Goals · Finance · Habits · Reflection** — *"A little progress, every day."*
Personal dashboard untuk **Alya Mukhbita Zahirah**. Ciptaan Ringga.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · MySQL · JWT (httpOnly cookie) · Chart.js · jsPDF · PWA

---

## 1. Yang perlu disiapkan

| File | Taruh di | Keterangan |
|---|---|---|
| **Foto Alya** | `public/images/alya.jpg` | Tampil di login, welcome, header, menu, recap, profil. Alya juga bisa ganti foto dari halaman Profile. |
| **Lagu** | `public/music/lagu.mp3` | Diputar otomatis & diulang (loop). Judul bisa diatur di `NEXT_PUBLIC_MUSIC_TITLE`. |

> Browser tidak mengizinkan audio berbunyi sebelum ada interaksi. Jadi lagu mulai otomatis pada sentuhan/klik pertama (misalnya saat tekan "Masuk" atau memilih mood), lalu terus berputar saat pindah halaman. Tombol 🎵 di kiri bawah untuk pause/play.
> Catatan: file di folder `public/` bisa dibuka siapa pun yang tahu URL-nya (termasuk foto default).

## 2. Jalankan lokal

```bash
npm install
cp .env.example .env.local        # lalu isi DB_* dan JWT_SECRET
npm run db:setup                  # buat tabel + akun Alya (+ data demo bila SEED_DEMO_DATA=true)
npm run dev                       # buka http://localhost:3000
```

Login memakai `SEED_EMAIL` / `SEED_PASSWORD` dari `.env.local`. **Ganti password setelah login pertama** (Profile → Ganti password).

### Setup MySQL
- **XAMPP / Laragon / MySQL lokal**: nyalakan MySQL, isi `DB_USER=root`, `DB_PASSWORD=` (kosong bila default). `npm run db:migrate` otomatis membuat database `alyas_green_space`.
- **Manual**: import `database/schema.sql` lewat phpMyAdmin / `mysql -u root -p alyas_green_space < database/schema.sql`.

## 3. Deploy ke Vercel

1. Siapkan MySQL cloud yang bisa diakses dari internet, mis. **TiDB Cloud Serverless** (gratis, MySQL-compatible), **Aiven MySQL**, atau **Railway MySQL**. Catat host, port, user, password, nama DB. Untuk TiDB/Aiven isi `DB_SSL=true`.
2. Dari laptop, arahkan `.env.local` ke DB cloud itu lalu jalankan `npm run db:setup` (sekali saja, `SEED_DEMO_DATA=false` untuk produksi).
3. Push project ke GitHub → **Vercel → Add New Project** → import repo.
4. Di **Settings → Environment Variables** isi semua variabel dari `.env.example` (`DB_*`, `DB_SSL`, `JWT_SECRET`, `APP_TIMEZONE`, `NEXT_PUBLIC_APP_TIMEZONE`, `NEXT_PUBLIC_MUSIC_*`).
5. **Storage → Create → Blob** lalu hubungkan ke project → `BLOB_READ_WRITE_TOKEN` terisi otomatis (wajib, karena filesystem Vercel tidak permanen untuk upload foto).
6. Deploy. Buka di HP → menu browser → **Add to Home Screen / Install app** → Green Space terbuka full-screen seperti aplikasi.

## 4. Struktur project

```
database/schema.sql        # migrasi MySQL (15 tabel, FK, index)
scripts/migrate.mjs        # npm run db:migrate
scripts/seed.mjs           # npm run db:seed (akun + demo data dev)
public/                    # manifest PWA, ikon, sw.js, music/, images/
src/middleware.ts          # proteksi halaman & API + cek origin (CSRF)
src/lib/
  db.ts                    # pool mysql2, query parameterized
  jwt.ts, auth.ts          # JWT HS256 di cookie httpOnly, rate-limit login
  api.ts, validators.ts    # wrapper route (auth + error), skema zod
  stats.ts, recap.ts       # progress, finance, habit, monthly/yearly recap
  streak.ts                # perhitungan current/longest streak & completion rate
  notifications.ts         # notifikasi berbasis event + pengecekan harian (dedup)
  lumi.ts                  # pesan Lumi dinamis dari data (bukan AI)
  pdf.ts                   # generator PDF (cover, stat, grafik batang, tabel)
  storage.ts               # upload foto (Vercel Blob / folder uploads), cek magic bytes
src/components/            # AppShell (sidebar + bottom tab + quick add), Lumi, ui, charts, dll
src/app/(app)/             # dashboard, journal, reflection, goals, savings, finance,
                           # habits, progress, recap, recap/yearly, reports, notifications, profile, settings
src/app/api/               # semua endpoint REST
```

## 5. API endpoints (ringkas)

| Endpoint | Method |
|---|---|
| `/api/auth/login` · `/logout` · `/me` · `/register` (bila `ALLOW_REGISTER=true`) | POST / GET |
| `/api/mood` | GET, POST |
| `/api/dashboard` · `/api/progress` | GET |
| `/api/journals` (search `q`, `mood`, `tag`, `favorite`, `date`, `month`, `from`, `to`, `page`) | GET, POST |
| `/api/journals/:id` · `/favorite` · `/api/journals/calendar?month=` | GET, PUT, DELETE / POST / GET |
| `/api/upload` · `/api/files/:name` | POST / GET (hanya pemilik) |
| `/api/reflections` | GET, POST (upsert) |
| `/api/goals` · `/:id` · `/:id/milestones` · `/api/milestones/:id` | CRUD |
| `/api/savings` · `/:id` · `/:id/move` (setor/tarik) | CRUD |
| `/api/transactions` · `/:id` · `/api/categories` · `/api/finance/summary?month=` | CRUD / GET |
| `/api/habits` · `/:id` · `/:id/toggle` | CRUD |
| `/api/notifications` · `/:id` | GET, PATCH, DELETE |
| `/api/recap/monthly?month=` (PUT refleksi bulanan) · `/api/recap/yearly?year=` | GET, PUT |
| `/api/reports/pdf?type=journal\|finance\|goals\|full&…` · `/api/export` | GET |
| `/api/profile` · `/api/profile/password` · `/api/settings` | GET, PUT |

## 6. Logika penting

- **Streak**: tanggal unik journal; streak berjalan dihitung mundur dari hari ini (atau kemarin bila hari ini belum menulis). Longest = rangkaian hari berurutan terpanjang. Habit memakai fungsi yang sama.
- **Today's progress**: Journal, Habits (selesai/aktif), Goals (rata-rata progress goal aktif), Finance (ada catatan hari ini), Reflection.
- **Goal**: progress dari `current/target` atau dari checklist milestone. Otomatis *Completed* saat 100%, *Overdue* dihitung dari deadline.
- **Saving goal**: setor/tarik tercatat sebagai transaksi kategori *Saving* yang terhubung ke goal → saldo Finance ikut menyesuaikan. Expense di analitik tidak menghitung setoran tabungan.
- **Notifikasi**: dibuat saat event (streak 3/7/14/21/30…, goal ≥80%, goal/saving selesai, habit streak) dan saat dashboard dibuka (journal reminder ≥18.00, habit reminder ≥19.00, deadline lewat, ringkasan bulan lalu, budget 80%). `dedup_key` mencegah notifikasi ganda.
- **Keamanan**: bcrypt (cost 12), JWT HS256 httpOnly+SameSite=Lax, semua query parameterized, validasi zod, setiap query memfilter `user_id`, cek origin untuk request yang mengubah data, upload dicek magic bytes & maks 5 MB, file lokal hanya bisa diakses pemiliknya.
