import { fail, ok, withAuth } from "@/lib/api";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

// POST multipart/form-data { file } → { url }
export const POST = withAuth(async (req, user) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return fail(400, "File foto tidak ditemukan.");
  const url = await saveImage(file, user.uid);
  return ok({ url }, 201);
});
