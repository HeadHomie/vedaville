const SUPABASE_URL = "https://vykoynxnndbloekpuwns.supabase.co";
const PHOTO_BUCKET = "transformation-story-photos";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REQUIRED_TEXT = ["first_name", "last_name", "email", "attribution_preference", "before_story", "turning_point", "practices", "transformation", "wisdom_to_share"];
const ALLOWED_ATTRIBUTION = new Set(["full_name", "first_name_last_initial", "first_name_only", "anonymous"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function safeFilename(name) {
  const parts = String(name || "photo").toLowerCase().split(".");
  const extension = parts.length > 1 ? parts.pop().replace(/[^a-z0-9]/g, "") : "jpg";
  const base = parts.join("-").normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "photo";
  return `${base}.${extension}`;
}

function slugify(firstName, lastName) {
  return `${firstName}-${lastName}`.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140);
}

function secretHeaders(env, extra = {}) {
  if (!env.SUPABASE_SECRET_KEY) throw new Error("Supabase server credentials are not configured.");
  return { apikey: env.SUPABASE_SECRET_KEY, authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, ...extra };
}

async function startSubmission(request, env) {
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
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${PHOTO_BUCKET}/${encodeURI(path)}`, {
        method: "POST",
        headers: secretHeaders(env, { "content-type": "application/json", "x-upsert": "false" }),
        body: "{}"
      });
      const signed = await response.json().catch(() => ({}));
      if (!response.ok || !signed.url) throw new Error(signed.message || "Could not prepare photo upload.");
      uploads.push({ original_name: String(file.name).slice(0, 255), path, signed_url: new URL(signed.url, SUPABASE_URL).toString() });
    }
    return json({ submission_id: body.submission_id, uploads });
  } catch (error) {
    console.error("start-submission", error);
    return json({ error: "We could not prepare your photos. Please try again." }, 500);
  }
}

async function submitStory(request, env) {
  try {
    const body = await request.json();
    if (!isUuid(body.submission_id)) return json({ error: "Invalid submission." }, 400);
    if (body.company_website) return json({ ok: true });
    for (const field of REQUIRED_TEXT) {
      if (!clean(body[field], 5000)) return json({ error: "Please complete every required question." }, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(clean(body.email, 254))) return json({ error: "Please enter a valid email address." }, 400);
    if (!ALLOWED_ATTRIBUTION.has(body.attribution_preference)) return json({ error: "Please choose how your name may appear." }, 400);
    if (body.story_consent !== true || body.truthfulness_confirmation !== true) return json({ error: "The required permissions must be confirmed." }, 400);
    const photoPaths = Array.isArray(body.photo_paths) ? body.photo_paths.slice(0, 4) : [];
    if (photoPaths.length && body.photo_consent !== true) return json({ error: "Photo permission is required when photos are included." }, 400);
    if (photoPaths.some(photo => typeof photo.path !== "string" || !photo.path.startsWith(`${body.submission_id}/`))) return json({ error: "Invalid photo reference." }, 400);

    const firstName = clean(body.first_name, 80);
    const lastName = clean(body.last_name, 80);
    const record = {
      id: body.submission_id,
      first_name: firstName,
      last_name: lastName,
      email: clean(body.email, 254).toLowerCase(),
      attribution_preference: body.attribution_preference,
      location: clean(body.location, 160) || null,
      circle_profile_url: clean(body.circle_profile_url, 500) || null,
      before_story: clean(body.before_story, 3000),
      turning_point: clean(body.turning_point, 3000),
      practices: clean(body.practices, 3000),
      transformation: clean(body.transformation, 4000),
      wisdom_to_share: clean(body.wisdom_to_share, 2000),
      additional_notes: clean(body.additional_notes, 2000) || null,
      photo_notes: clean(body.photo_notes, 1000) || null,
      photo_paths: photoPaths,
      photo_bucket: PHOTO_BUCKET,
      story_consent: true,
      photo_consent: body.photo_consent === true,
      truthfulness_confirmation: true,
      publication_approved: false,
      status: "submitted",
      source: "share.vedaville.com",
      source_url: clean(body.source_url, 500) || "https://share.vedaville.com/",
      requested_slug: slugify(firstName, lastName)
    };
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transformation_stories`, {
      method: "POST",
      headers: secretHeaders(env, { "content-type": "application/json", prefer: "return=minimal" }),
      body: JSON.stringify(record)
    });
    const errorBody = await response.text();
    if (!response.ok) throw new Error(errorBody || "Database insert failed.");
    return json({ ok: true, submission_id: body.submission_id });
  } catch (error) {
    console.error("submit-story", error);
    return json({ error: "We could not save your story. Please try again." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/start-submission") return startSubmission(request, env);
    if (request.method === "POST" && url.pathname === "/api/submit-story") return submitStory(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
