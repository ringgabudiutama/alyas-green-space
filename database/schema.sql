-- =====================================================================
--  ALYA'S GREEN SPACE — MySQL schema (migration v1)
--  Ciptaan Ringga
--  Jalankan: npm run db:migrate   (atau import manual file ini)
--  Semua tabel memakai utf8mb4 agar emoji aman disimpan.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  bio           VARCHAR(500)  NULL,
  quote         VARCHAR(300)  NULL,
  photo_url     VARCHAR(600)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id         INT UNSIGNED PRIMARY KEY,
  theme           ENUM('light','dark') NOT NULL DEFAULT 'light',
  notify_journal  TINYINT(1) NOT NULL DEFAULT 1,
  notify_goal     TINYINT(1) NOT NULL DEFAULT 1,
  notify_habit    TINYINT(1) NOT NULL DEFAULT 1,
  notify_finance  TINYINT(1) NOT NULL DEFAULT 1,
  monthly_budget  DECIMAL(15,2) NOT NULL DEFAULT 0,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS moods (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  mood_date  DATE NOT NULL,
  mood       ENUM('happy','calm','okay','sad','stressed') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_moods_user_date (user_id, mood_date),
  CONSTRAINT fk_moods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS journals (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(200) NOT NULL,
  content     MEDIUMTEXT NOT NULL,
  mood        ENUM('happy','calm','okay','sad','stressed') NULL,
  tags        VARCHAR(500) NULL COMMENT 'dipisah koma, mis: kuliah,keluarga',
  entry_date  DATE NOT NULL,
  is_favorite TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_journals_user_date (user_id, entry_date),
  CONSTRAINT fk_journals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS journal_photos (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  journal_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  url        VARCHAR(600) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_photos_journal (journal_id),
  CONSTRAINT fk_photos_journal FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
  CONSTRAINT fk_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_reflections (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  reflection_date DATE NOT NULL,
  happy_moment    TEXT NULL,
  lesson          TEXT NULL,
  improvement     TEXT NULL,
  rating          TINYINT UNSIGNED NULL COMMENT '1-5',
  journal_id      INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reflection_user_date (user_id, reflection_date),
  CONSTRAINT fk_reflection_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reflection_journal FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goals (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NULL,
  category      ENUM('short_term','long_term','personal','education','career','financial','health','other') NOT NULL DEFAULT 'personal',
  target_value  DECIMAL(15,2) NOT NULL DEFAULT 100,
  current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  unit          VARCHAR(40) NULL COMMENT 'mis: %, buku, jam, km',
  progress_mode ENUM('value','milestones') NOT NULL DEFAULT 'value' COMMENT 'value = current/target, milestones = checklist selesai',
  deadline      DATE NULL,
  priority      ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  status        ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress' COMMENT 'Overdue dihitung otomatis dari deadline',
  completed_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_goals_user_status (user_id, status),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goal_milestones (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goal_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(200) NOT NULL,
  is_done    TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  done_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_milestones_goal (goal_id),
  CONSTRAINT fk_milestones_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saving_goals (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  title          VARCHAR(160) NOT NULL,
  emoji          VARCHAR(16) NULL,
  target_amount  DECIMAL(15,2) NOT NULL,
  initial_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'saldo awal sebelum dicatat lewat transaksi',
  deadline       DATE NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_saving_user (user_id),
  CONSTRAINT fk_saving_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NULL COMMENT 'NULL = kategori bawaan untuk semua user',
  name       VARCHAR(60) NOT NULL,
  type       ENUM('income','expense','both','saving') NOT NULL,
  icon       VARCHAR(16) NULL,
  KEY idx_categories_user (user_id),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  type           ENUM('income','expense') NOT NULL,
  category_id    INT UNSIGNED NOT NULL,
  amount         DECIMAL(15,2) NOT NULL,
  description    VARCHAR(300) NULL,
  trx_date       DATE NOT NULL,
  saving_goal_id INT UNSIGNED NULL COMMENT 'terisi jika transaksi adalah setoran/penarikan tabungan',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_trx_user_date (user_id, trx_date),
  KEY idx_trx_saving (saving_goal_id),
  CONSTRAINT fk_trx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_trx_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_trx_saving FOREIGN KEY (saving_goal_id) REFERENCES saving_goals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habits (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  name           VARCHAR(120) NOT NULL,
  category       ENUM('reading','exercise','water','study','journal','sleep','other') NOT NULL DEFAULT 'other',
  icon           VARCHAR(16) NULL,
  target_minutes INT UNSIGNED NULL COMMENT 'durasi default per hari (untuk menghitung jam belajar)',
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_habits_user (user_id),
  CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habit_logs (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  habit_id   INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  log_date   DATE NOT NULL,
  minutes    INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_habit_log (habit_id, log_date),
  KEY idx_habit_logs_user_date (user_id, log_date),
  CONSTRAINT fk_habit_logs_habit FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  CONSTRAINT fk_habit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       ENUM('lumi','journal_reminder','goal_progress','habit_reminder','finance_summary','goal_completed','streak') NOT NULL,
  title      VARCHAR(160) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  link       VARCHAR(200) NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  dedup_key  VARCHAR(120) NULL COMMENT 'mencegah notifikasi ganda untuk kejadian yang sama',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_dedup (user_id, dedup_key),
  KEY idx_notif_user_read (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_reviews (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  month      CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  learned    TEXT NULL,
  proud      TEXT NULL,
  improve    TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review_user_month (user_id, month),
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Kategori bawaan (ID tetap supaya aman dijalankan berulang kali)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO categories (id, user_id, name, type, icon) VALUES
  (1,  NULL, 'Food',           'expense', '🍜'),
  (2,  NULL, 'Transportation', 'expense', '🚌'),
  (3,  NULL, 'Education',      'expense', '📚'),
  (4,  NULL, 'Shopping',       'expense', '🛍️'),
  (5,  NULL, 'Entertainment',  'expense', '🎬'),
  (6,  NULL, 'Health',         'expense', '💊'),
  (7,  NULL, 'Bills',          'expense', '🧾'),
  (8,  NULL, 'Salary',         'income',  '💼'),
  (9,  NULL, 'Freelance',      'income',  '💻'),
  (10, NULL, 'Gift',           'income',  '🎁'),
  (11, NULL, 'Other',          'both',    '✨'),
  (12, NULL, 'Saving',         'saving',  '🌱');
