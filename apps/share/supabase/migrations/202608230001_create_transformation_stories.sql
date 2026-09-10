create extension if not exists pgcrypto;

create table if not exists public.transformation_stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  attribution_preference text not null check (attribution_preference in ('full_name', 'first_name_last_initial', 'first_name_only', 'anonymous')),
  location text,
  circle_profile_url text,
  before_story text not null,
  turning_point text not null,
  practices text not null,
  transformation text not null,
  wisdom_to_share text not null,
  additional_notes text,
  photo_notes text,
  photo_bucket text not null default 'transformation-story-photos',
  photo_paths jsonb not null default '[]'::jsonb,
  story_consent boolean not null default false,
  photo_consent boolean not null default false,
  truthfulness_confirmation boolean not null default false,
  publication_approved boolean not null default false,
  approved_at timestamptz,
  status text not null default 'submitted' check (status in ('submitted', 'drafting', 'awaiting_approval', 'approved', 'published', 'declined', 'withdrawn')),
  source text not null default 'share.vedaville.com',
  source_url text,
  requested_slug text not null,
  circle_page_url text,
  circle_page_id text,
  circle_post_url text,
  circle_post_id bigint,
  circle_post_status text check (circle_post_status in ('draft', 'published', 'scheduled')),
  published_at timestamptz,
  internal_notes text
);

create index if not exists transformation_stories_status_created_at_idx
  on public.transformation_stories (status, created_at);

create unique index if not exists transformation_stories_circle_post_id_idx
  on public.transformation_stories (circle_post_id)
  where circle_post_id is not null;

alter table public.transformation_stories enable row level security;
revoke all on table public.transformation_stories from anon, authenticated;
grant all on table public.transformation_stories to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transformation-story-photos',
  'transformation-story-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_transformation_story_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_transformation_story_updated_at on public.transformation_stories;
create trigger set_transformation_story_updated_at
before update on public.transformation_stories
for each row execute function public.set_transformation_story_updated_at();
