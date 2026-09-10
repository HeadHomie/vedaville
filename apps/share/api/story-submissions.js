import { PHOTO_BUCKET, getSupabaseSecretKey, supabaseHeaders, supabaseUrl } from "./_supabase.js";

export const config = { runtime: "edge" };

const COOKIE_NAME = "vedaville_story_dashboard";
const PASSWORD_HASH = process.env.STORY_DASHBOARD_PASSWORD_HASH || "4b7e172afd07683e8e12fd8bea360920535010006a497822d67568dbd26bc043";
const SESSION_SECONDS = 12 * 60 * 60;
const STATUSES = ["submitted", "drafting", "awaiting_approval", "approved", "published", "declined", "withdrawn"];

const encoder = new TextEncoder();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmac(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSupabaseSecretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function equalStrings(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function passwordMatches(password) {
  return equalStrings(await sha256(String(password || "")), PASSWORD_HASH);
}

function cookieValue(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function isAuthenticated(request) {
  const [expires, signature] = cookieValue(request).split(".");
  if (!expires || !signature || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return equalStrings(await hmac(expires), signature);
}

async function sessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${COOKIE_NAME}=${expires}.${await hmac(String(expires))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function redirect(cookie) {
  return new Response(null, { status: 303, headers: { location: "/story-submissions", "set-cookie": cookie } });
}

function page(content, { title = "Story submissions", status = 200 } = {}) {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${escapeHtml(title)} | Vedaville</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,600&family=Mulish:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root { --cream:#f8f2ed; --sand:#f1ead9; --ink:#22301a; --green:#3a5628; --green-deep:#2c4120; --green-night:#243418; --gold:#cc9933; --gold-soft:#dcbe7a; --plum:#59114d; --white:#fffdf9; --serif:"Cormorant Garamond",Georgia,serif; --sans:"Mulish",sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:var(--sand); font:15px/1.6 var(--sans); }
    a { color:inherit; }
    .topbar { position:sticky; top:0; z-index:10; color:var(--cream); background:rgba(36,52,24,.97); border-bottom:1px solid rgba(220,190,122,.22); }
    .topbar-inner { width:min(1240px,calc(100% - 40px)); min-height:70px; margin:auto; display:flex; align-items:center; gap:22px; }
    .brand { color:var(--gold-soft); font:600 24px/1 var(--serif); letter-spacing:.11em; text-decoration:none; }
    .topbar nav { margin-left:auto; display:flex; align-items:center; gap:18px; }
    .topbar a, .link-button { color:rgba(255,255,255,.86); border:0; background:transparent; cursor:pointer; font:700 12px/1 var(--sans); text-decoration:none; }
    .shell { width:min(1240px,calc(100% - 40px)); margin:0 auto; padding:58px 0 90px; }
    .dashboard-head { display:flex; align-items:end; justify-content:space-between; gap:28px; margin-bottom:34px; }
    .eyebrow { margin:0 0 8px; color:var(--gold); font-size:11px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
    h1,h2,h3 { margin:0; color:var(--green); font-family:var(--serif); font-weight:600; line-height:1.08; }
    h1 { font-size:clamp(42px,6vw,64px); }
    h2 { font-size:28px; }
    h3 { font-size:23px; }
    .muted { color:#66705d; }
    .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:24px; }
    .stat { padding:20px; background:rgba(255,253,249,.78); border:1px solid #e2d5be; border-radius:16px; }
    .stat strong { display:block; color:var(--green); font:600 32px/1 var(--serif); }
    .stat span { color:#6e7566; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    .filters { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 26px; }
    .filter { padding:8px 13px; border:1px solid #d8c9ae; border-radius:999px; background:rgba(255,253,249,.58); text-decoration:none; font-size:12px; font-weight:700; }
    .filter.active { color:white; background:var(--plum); border-color:var(--plum); }
    .story-list { display:grid; gap:16px; }
    details { overflow:hidden; background:var(--white); border:1px solid #e2d5be; border-radius:18px; box-shadow:0 12px 34px rgba(34,48,26,.07); }
    summary { display:grid; grid-template-columns:minmax(190px,1.2fr) minmax(180px,1fr) 140px 120px 24px; gap:18px; align-items:center; padding:22px 24px; cursor:pointer; list-style:none; }
    summary::-webkit-details-marker { display:none; }
    summary::after { content:"+"; grid-column:5; color:var(--gold); font:600 24px/1 var(--serif); }
    details[open] summary::after { content:"−"; }
    .person strong { display:block; color:var(--green-deep); font:600 21px/1.15 var(--serif); }
    .person span,.date { color:#727969; font-size:12px; }
    .slug { overflow:hidden; color:#5f6856; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
    .badge { width:max-content; padding:6px 10px; border-radius:999px; color:var(--green-deep); background:#eef3e9; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
    .story-body { padding:4px 24px 28px; border-top:1px solid #eee4d5; }
    .story-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; padding-top:22px; }
    .answer { padding:18px; background:#fbf7ef; border-radius:12px; }
    .answer.wide { grid-column:1 / -1; }
    .answer h3 { margin-bottom:8px; font-size:20px; }
    .answer p { margin:0; white-space:pre-wrap; }
    .photos { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:18px; }
    .photos img { width:100%; height:210px; object-fit:cover; border-radius:12px; }
    .empty { padding:46px; text-align:center; background:var(--white); border:1px solid #e2d5be; border-radius:18px; }
    .login-shell { min-height:100vh; display:grid; place-items:center; padding:28px; background:linear-gradient(rgba(36,52,24,.76),rgba(36,52,24,.86)),url('/assets/closing-tea-community-v1.png') center/cover; }
    .login-card { width:min(460px,100%); padding:44px; background:var(--cream); border:1px solid rgba(220,190,122,.7); border-radius:22px; box-shadow:0 30px 80px rgba(0,0,0,.28); }
    .login-card h1 { margin-bottom:12px; font-size:46px; }
    .login-card p { margin:0 0 24px; color:#5e6855; }
    label { display:block; color:var(--green-deep); font-size:13px; font-weight:800; }
    input { width:100%; margin-top:8px; padding:14px 15px; color:var(--ink); background:white; border:1px solid #cfc4b0; border-radius:9px; font:16px var(--sans); }
    .button { width:100%; margin-top:18px; padding:15px 22px; color:white; background:var(--plum); border:0; border-radius:999px; cursor:pointer; font:800 14px var(--sans); }
    .error { margin:0 0 18px!important; padding:11px 13px; color:#762b27!important; background:#fae8e6; border:1px solid #e2b6b2; border-radius:9px; font-size:13px; }
    @media(max-width:850px){ .stats{grid-template-columns:1fr 1fr}.dashboard-head{align-items:start;flex-direction:column}summary{grid-template-columns:1fr auto}.person{grid-column:1}.slug{grid-column:1}.date{grid-column:1}.badge{grid-column:2;grid-row:1}summary::after{grid-column:2;grid-row:2}.story-grid{grid-template-columns:1fr}.answer.wide{grid-column:auto} }
    @media(max-width:520px){ .shell,.topbar-inner{width:min(100% - 24px,1240px)}.shell{padding-top:38px}.stats{grid-template-columns:1fr 1fr}.login-card{padding:32px 24px}summary{padding:18px}.story-body{padding:2px 18px 22px} }
  </style>
</head>
<body>${content}</body>
</html>`, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer"
    }
  });
}

function loginPage(error = "") {
  return page(`<main class="login-shell">
    <section class="login-card" aria-labelledby="login-title">
      <p class="eyebrow">Vedaville private dashboard</p>
      <h1 id="login-title">Story submissions</h1>
      <p>Enter the dashboard password to review community transformation stories.</p>
      ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/story-submissions">
        <input type="hidden" name="intent" value="login">
        <label>Password<input type="password" name="password" required autocomplete="current-password" autofocus></label>
        <button class="button" type="submit">Open dashboard</button>
      </form>
    </section>
  </main>`, { title: "Story submissions login", status: error ? 401 : 200 });
}

async function signedPhotoUrl(path) {
  try {
    const safePath = String(path).split("/").map(encodeURIComponent).join("/");
    const response = await fetch(supabaseUrl(`/storage/v1/object/sign/${PHOTO_BUCKET}/${safePath}`), {
      method: "POST",
      headers: supabaseHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ expiresIn: 60 * 60 })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !(result.signedURL || result.signedUrl)) return "";
    return new URL(`/storage/v1${result.signedURL || result.signedUrl}`, supabaseUrl("/")).toString();
  } catch {
    return "";
  }
}

async function loadStories(status) {
  const statusQuery = STATUSES.includes(status) ? `&status=eq.${encodeURIComponent(status)}` : "";
  const response = await fetch(supabaseUrl(`/rest/v1/transformation_stories?select=*&order=created_at.desc&limit=200${statusQuery}`), {
    headers: supabaseHeaders()
  });
  const result = await response.json().catch(() => []);
  if (!response.ok) throw new Error(result.message || "The submissions could not be loaded.");
  return Promise.all(result.map(async story => {
    const photos = Array.isArray(story.photo_paths) ? story.photo_paths : [];
    return {
      ...story,
      photos: await Promise.all(photos.map(async photo => ({ ...photo, url: await signedPhotoUrl(photo.path) })))
    };
  }));
}

function storyName(story) {
  return [story.first_name, story.last_name].filter(Boolean).join(" ") || "Unnamed member";
}

function answer(title, value, wide = false) {
  if (!value) return "";
  return `<section class="answer${wide ? " wide" : ""}"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(value)}</p></section>`;
}

function storyCard(story) {
  const photos = story.photos.filter(photo => photo.url).map(photo => `<figure><img src="${escapeHtml(photo.url)}" alt="Photo submitted by ${escapeHtml(storyName(story))}" loading="lazy"><figcaption class="muted">${escapeHtml(photo.original_name || "Submitted photo")}</figcaption></figure>`).join("");
  return `<details>
    <summary>
      <div class="person"><strong>${escapeHtml(storyName(story))}</strong><span>${escapeHtml(story.email)}</span></div>
      <div class="slug">/${escapeHtml(story.requested_slug || "")}</div>
      <time class="date" datetime="${escapeHtml(story.created_at)}">${escapeHtml(new Date(story.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }))}</time>
      <span class="badge">${escapeHtml(String(story.status || "submitted").replaceAll("_", " "))}</span>
    </summary>
    <div class="story-body">
      <div class="story-grid">
        ${answer("Before Ayurveda", story.before_story)}
        ${answer("What opened the door", story.turning_point)}
        ${answer("Meaningful practices", story.practices)}
        ${answer("What changed", story.transformation)}
        ${answer("Wisdom to share", story.wisdom_to_share, true)}
        ${answer("Additional notes", story.additional_notes, true)}
        ${answer("Photo notes", story.photo_notes, true)}
      </div>
      ${photos ? `<div class="photos">${photos}</div>` : ""}
    </div>
  </details>`;
}

function dashboardPage(stories, activeStatus) {
  const counts = Object.fromEntries(STATUSES.map(status => [status, stories.filter(story => story.status === status).length]));
  const filters = [
    `<a class="filter${activeStatus ? "" : " active"}" href="/story-submissions">All</a>`,
    ...STATUSES.map(status => `<a class="filter${activeStatus === status ? " active" : ""}" href="/story-submissions?status=${status}">${escapeHtml(status.replaceAll("_", " "))}</a>`)
  ].join("");
  return page(`<header class="topbar"><div class="topbar-inner">
      <a class="brand" href="/">VEDAVILLE</a>
      <nav><a href="/">Story form</a><form method="post" action="/story-submissions"><input type="hidden" name="intent" value="logout"><button class="link-button" type="submit">Log out</button></form></nav>
    </div></header>
    <main class="shell">
      <div class="dashboard-head"><div><p class="eyebrow">Private review workspace</p><h1>Story submissions</h1></div><p class="muted">Newest submissions appear first. Open any entry to review the full story.</p></div>
      <section class="stats" aria-label="Submission totals">
        <div class="stat"><strong>${stories.length}</strong><span>${activeStatus ? "Matching" : "Total"}</span></div>
        <div class="stat"><strong>${counts.submitted || 0}</strong><span>Submitted</span></div>
        <div class="stat"><strong>${counts.awaiting_approval || 0}</strong><span>Awaiting approval</span></div>
        <div class="stat"><strong>${counts.published || 0}</strong><span>Published</span></div>
      </section>
      <nav class="filters" aria-label="Filter submissions">${filters}</nav>
      <section class="story-list">${stories.length ? stories.map(storyCard).join("") : `<div class="empty"><h2>No submissions found</h2><p class="muted">New community stories will appear here after the form is submitted.</p></div>`}</section>
    </main>`);
}

export default async function handler(request) {
  try {
    if (request.method === "POST") {
      const form = await request.formData();
      const intent = form.get("intent");
      if (intent === "logout") return redirect(clearCookie());
      if (intent === "login") {
        if (!(await passwordMatches(form.get("password")))) return loginPage("That password is not correct.");
        return redirect(await sessionCookie());
      }
      return page("<p>Method not allowed.</p>", { status: 405 });
    }
    if (request.method !== "GET") return page("<p>Method not allowed.</p>", { status: 405 });
    if (!(await isAuthenticated(request))) return loginPage();
    const status = new URL(request.url).searchParams.get("status") || "";
    return dashboardPage(await loadStories(status), status);
  } catch (error) {
    console.error("story-submissions", error);
    return page(`<main class="login-shell"><section class="login-card"><p class="eyebrow">Vedaville private dashboard</p><h1>Dashboard unavailable</h1><p>The submissions dashboard is not connected to its database yet. Please check the server configuration and try again.</p></section></main>`, { title: "Dashboard unavailable", status: 503 });
  }
}
