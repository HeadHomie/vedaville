const SUPABASE_URL = process.env.SUPABASE_URL || "https://vykoynxnndbloekpuwns.supabase.co";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PHOTO_BUCKET = "transformation-story-photos";

export function assertConfigured() {
  if (!SUPABASE_SECRET_KEY) throw new Error("Supabase server credentials are not configured.");
}

export function getSupabaseSecretKey() {
  assertConfigured();
  return SUPABASE_SECRET_KEY;
}

export function supabaseHeaders(extra = {}) {
  assertConfigured();
  return {
    apikey: SUPABASE_SECRET_KEY,
    authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    ...extra
  };
}

export function supabaseUrl(path) {
  return `${SUPABASE_URL}${path}`;
}

export function json(responseBody, status = 200) {
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export function safeFilename(name) {
  const parts = String(name || "photo").toLowerCase().split(".");
  const extension = parts.length > 1 ? parts.pop().replace(/[^a-z0-9]/g, "") : "jpg";
  const base = parts.join("-").normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "photo";
  return `${base}.${extension}`;
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
