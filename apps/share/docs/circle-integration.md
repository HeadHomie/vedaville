# Vedaville transformation-story publishing workflow

## Weekly outreach

1. Review active Circle member profile descriptions and recent constructive participation.
2. Exclude admins, moderators, previously contacted members, anyone already featured, and members whose profiles do not provide a respectful reason to invite them.
3. Select one person based on their self-described connection to Ayurveda or community participation. Do not infer a diagnosis, health status, trauma, or vulnerability.
4. Send a personalized Circle DM with `https://share.vedaville.com/` and record that the member was contacted.

## Submission and approval

1. A form submission creates a `transformation_stories` row with `status = 'submitted'`. Photos remain in the private `transformation-story-photos` bucket.
2. Format the member's words into a clear first-person story while preserving meaning and avoiding unsupported medical claims.
3. Set `status = 'awaiting_approval'` and send the member the complete draft, proposed title, photo choices, attribution, and requested slug.
4. Do not publish until `publication_approved = true` and `status = 'approved'` are explicitly recorded.

## Circle publication

1. Create the actual feature as a public Circle Website page with the Pages/Site Builder function. Use the approved story and `requested_slug` (`firstname-lastname`) so the feature lives at `https://vedaville.com/firstname-lastname`. Store its URL and identifier in `circle_page_url` and `circle_page_id`.
2. Verify the feature page as a logged-out visitor before creating the feed announcement.
3. Create a **draft** post in Circle space `Public Posts` (space ID `219601`). This post is an announcement that the new feature has been published; it should include a short excerpt, name the featured member according to their attribution preference, and link to the Circle Website page. Do not reproduce the full story in the feed and do not publish this post automatically.
4. Store the draft announcement's URL and ID in `circle_post_url` and `circle_post_id`, and leave `circle_post_status = 'draft'` for editorial review.
5. If the Circle Website Pages function is not available to the automation, stop and request an admin to create or authorize the page. Do not silently replace the requested page with a feed post or other content type.
6. After the feature page is live and the feed announcement draft exists, update the row to `status = 'published'` and set `published_at`.
7. Send the member the public feature-page link and thank them. The draft feed announcement remains with the Vedaville team for review and scheduling.

## Supported API boundary

- Circle's Admin API and the connected Circle tools support reading member profiles, sending direct messages, applying member tags, and creating a `draft` post in `Public Posts`.
- As of August 23, 2026, the public Admin API does not expose Website Pages/Site Builder create, update, or publish operations. The feature Page therefore requires an authenticated Circle Site Builder browser step or a future Circle-supported Pages endpoint.
- Keep this boundary explicit: API automation may prepare the approved page content and create the draft feed announcement only after the Page URL exists, but it must not substitute a standard post for the feature Page.

## Outreach duplicate prevention

After a successful invitation DM, apply the private Circle member tag `Transformation Story Invite Sent` (ID `283682`). Weekly selection must exclude every member with that tag. Do not apply the tag when message delivery fails.

## URL behavior

Circle Website pages support custom root slugs such as `https://vedaville.com/firstname-lastname`. The separate `Public Posts` item is only a draft feed announcement and uses Circle's space path. These are two distinct Circle objects and must not be treated as interchangeable.
