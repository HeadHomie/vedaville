import { PHOTO_BUCKET, isUuid, json, supabaseHeaders, supabaseUrl } from "./_supabase.js";

export const config = { runtime: "edge" };

const requiredText = ["first_name", "last_name", "email", "attribution_preference", "before_story", "turning_point", "practices", "transformation", "wisdom_to_share"];
const allowedAttribution = new Set(["full_name", "first_name_last_initial", "first_name_only", "anonymous"]);

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function slugify(firstName, lastName) {
  return `${firstName}-${lastName}`.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140);
}

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const body = await request.json();
    if (!isUuid(body.submission_id)) return json({ error: "Invalid submission." }, 400);
    if (body.company_website) return json({ ok: true });
    for (const field of requiredText) {
      if (!clean(body[field], 5000)) return json({ error: "Please complete every required question." }, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(clean(body.email, 254))) return json({ error: "Please enter a valid email address." }, 400);
    if (!allowedAttribution.has(body.attribution_preference)) return json({ error: "Please choose how your name may appear." }, 400);
    if (body.story_consent !== true || body.truthfulness_confirmation !== true) return json({ error: "The required permissions must be confirmed." }, 400);
    const photoPaths = Array.isArray(body.photo_paths) ? body.photo_paths.slice(0, 4) : [];
    if (photoPaths.length && body.photo_consent !== true) return json({ error: "Photo permission is required when photos are included." }, 400);
    if (photoPaths.some(photo => typeof photo.path !== "string" || !photo.path.startsWith(`${body.submission_id}/`))) {
      return json({ error: "Invalid photo reference." }, 400);
    }

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
      before_story: clean(body.before_story, 12000),
      turning_point: clean(body.turning_point, 12000),
      practices: clean(body.practices, 12000),
      transformation: clean(body.transformation, 12000),
      wisdom_to_share: clean(body.wisdom_to_share, 8000),
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

    const response = await fetch(supabaseUrl("/rest/v1/transformation_stories"), {
      method: "POST",
      headers: supabaseHeaders({ "content-type": "application/json", prefer: "return=minimal" }),
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
