import { z } from "zod";
import { isValidYmd } from "./dates";

const ymd = z.string().refine(isValidYmd, "format tanggal harus YYYY-MM-DD");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const moodEnum = z.enum(["happy", "calm", "okay", "sad", "stressed"]);

// URL foto hanya boleh dari endpoint file kita sendiri atau Vercel Blob
export const photoUrl = z
  .string()
  .max(600)
  .refine(
    (u) => /^\/api\/files\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(u) || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(u),
    "URL foto tidak valid"
  );

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(1).max(200),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(8, "minimal 8 karakter").max(200),
});

export const moodSchema = z.object({ mood: moodEnum, date: ymd.optional() });

export const journalSchema = z.object({
  title: z.string().trim().min(1, "judul wajib diisi").max(200),
  content: z.string().trim().min(1, "isi journal wajib diisi").max(60000),
  mood: moodEnum.nullable().optional(),
  tags: z
    .array(z.string().trim().min(1).max(40).regex(/^[^,]+$/, "tag tidak boleh mengandung koma"))
    .max(15)
    .optional()
    .default([]),
  entryDate: ymd,
  isFavorite: z.boolean().optional(),
  photos: z.array(photoUrl).max(8).optional().default([]),
});

export const reflectionSchema = z.object({
  date: ymd,
  happyMoment: optionalText(3000),
  lesson: optionalText(3000),
  improvement: optionalText(3000),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  journalId: z.number().int().positive().nullable().optional(),
});

export const goalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalText(3000),
  category: z.enum(["short_term", "long_term", "personal", "education", "career", "financial", "health", "other"]),
  targetValue: z.number().positive().max(1e12),
  currentValue: z.number().min(0).max(1e12),
  unit: optionalText(40),
  progressMode: z.enum(["value", "milestones"]).default("value"),
  deadline: ymd.nullable().optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["in_progress", "completed"]).optional(),
  milestones: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
});
export const goalPatchSchema = goalSchema.partial();

export const milestoneSchema = z.object({ title: z.string().trim().min(1).max(200) });
export const milestonePatchSchema = z.object({
  isDone: z.boolean().optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

export const savingSchema = z.object({
  title: z.string().trim().min(1).max(160),
  emoji: optionalText(16),
  targetAmount: z.number().positive().max(1e13),
  initialAmount: z.number().min(0).max(1e13).default(0),
  deadline: ymd.nullable().optional(),
});

export const savingMoveSchema = z.object({
  amount: z.number().positive().max(1e13),
  direction: z.enum(["deposit", "withdraw"]),
  date: ymd,
  description: optionalText(300),
});

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  categoryId: z.number().int().positive(),
  amount: z.number().positive().max(1e13),
  description: optionalText(300),
  date: ymd,
  savingGoalId: z.number().int().positive().nullable().optional(),
});

export const habitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(["reading", "exercise", "water", "study", "journal", "sleep", "other"]),
  icon: optionalText(16),
  targetMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const habitToggleSchema = z.object({ date: ymd, minutes: z.number().int().min(0).max(1440).nullable().optional() });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(190),
  bio: optionalText(500),
  quote: optionalText(300),
  photoUrl: photoUrl.nullable().optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(8, "minimal 8 karakter")
    .max(200)
    .regex(/[A-Za-z]/, "harus mengandung huruf")
    .regex(/[0-9]/, "harus mengandung angka"),
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  notifyJournal: z.boolean().optional(),
  notifyGoal: z.boolean().optional(),
  notifyHabit: z.boolean().optional(),
  notifyFinance: z.boolean().optional(),
  monthlyBudget: z.number().min(0).max(1e13).optional(),
});

export const monthlyReviewSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  learned: optionalText(5000),
  proud: optionalText(5000),
  improve: optionalText(5000),
});
