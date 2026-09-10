# Weekly Vedaville transformation-story automation

Run this workflow once each Monday. Keep an audit trail in the `transformation_stories` table and never publish a member's story or photos without explicit approval.

## 1. Finish approved stories first

- Read `transformation_stories` rows whose status is `submitted`, `awaiting_approval`, or `approved`.
- For `submitted` rows, format the member's answers into a warm, faithful first-person feature. Preserve meaning, avoid embellishment, and do not convert personal experience into medical claims.
- Send the full draft, proposed title, approved attribution, selected photos, captions, and `requested_slug` to the member for review. Update the row to `awaiting_approval`.
- Only continue to publication when the row records `publication_approved = true` and `status = 'approved'`.

## 2. Publish the feature as a Circle Page

- Use Circle Website Pages/Site Builder to create the actual public feature page.
- Use the approved title, story, attribution, photos, captions, alt text, and meta description.
- Set the page slug to the row's exact `requested_slug`, producing `https://vedaville.com/firstname-lastname`.
- If the slug already exists, stop and request editorial direction; do not append a number or overwrite an existing page.
- Publish the Page and verify it while logged out.
- Store the Page URL and ID in `circle_page_url` and `circle_page_id`.

## 3. Create the feed announcement as a draft

- In Circle `Public Posts` (space ID `219601`), create a **draft** announcement that the new transformation feature has been published.
- Include a short approved excerpt and a link to the public Circle Page.
- Do not paste the full feature into the draft and do not publish, schedule, or notify members automatically.
- Store the draft post URL and ID in `circle_post_url` and `circle_post_id`; set `circle_post_status = 'draft'`.
- Set the story row to `status = 'published'` and record `published_at` only after the Page is public and the announcement draft exists.
- Send the featured member the Page link and a thank-you message.

## 4. Invite one new member

- Review active Circle member profile descriptions and recent constructive participation.
- Exclude admins, moderators, existing featured members, people without enough self-described context for a respectful invitation, and everyone carrying the private Circle tag `Transformation Story Invite Sent` (ID `283682`).
- Do not infer diagnoses, health conditions, trauma, or vulnerability.
- Choose one member based on their stated connection to Ayurveda or meaningful community participation.
- Send one personalized DM inviting them to share at `https://share.vedaville.com/`. Only after delivery succeeds, apply tag ID `283682` so they are not contacted twice. Do not tag them if delivery fails.

If Circle Pages, Supabase, or member messaging is unavailable, stop that affected step and report the blocker. Never substitute a published feed post for the requested public Page.
