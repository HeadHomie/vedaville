import { PHOTO_BUCKET, isUuid, json, safeFilename, supabaseHeaders, supabaseUrl } from "./_supabase.js";

export const config = { runtime: "edge" };

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const body = await request.json();
    if (!isUuid(body.submission_id)) return json({ error: "Invalid submission." }, 400);
    if (!Array.isArray(body.files) || body.files.length > 4) return json({ error: "Add no more than four photos." }, 400);

    const uploads = [];
    for (let index = 0; index < body.files.length; index += 1) {
      const file = body.files[index];
      if (!ALLOWED_TYPES.has(file.type) || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return json({ error: "Photos must be JPG, PNG, or WebP files no larger than 10 MB." }, 400);
      }
      const filename = `${index + 1}-${safeFilename(file.name)}`;
      const path = `${body.submission_id}/${filename}`;
      const response = await fetch(supabaseUrl(`/storage/v1/object/upload/sign/${PHOTO_BUCKET}/${encodeURI(path)}`), {
        method: "POST",
        headers: supabaseHeaders({ "content-type": "application/json", "x-upsert": "false" }),
        body: "{}"
      });
      const signed = await response.json().catch(() => ({}));
      if (!response.ok || !signed.url) throw new Error(signed.message || "Could not prepare photo upload.");
      uploads.push({
        original_name: String(file.name).slice(0, 255),
        path,
        signed_url: new URL(signed.url, supabaseUrl("/")).toString()
      });
    }
    return json({ submission_id: body.submission_id, uploads });
  } catch (error) {
    console.error("start-submission", error);
    return json({ error: "We could not prepare your photos. Please try again." }, 500);
  }
}
