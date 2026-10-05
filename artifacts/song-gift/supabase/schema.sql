-- Run this once in the Supabase SQL editor for the project used by Song Gift.
create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  stripe_session_id text not null unique,
  package text not null check (package in ('single', 'triple', 'collection')),
  credits_total integer not null check (credits_total > 0),
  credits_used integer not null default 1 check (credits_used >= 0 and credits_used <= credits_total),
  amount_paid integer not null check (amount_paid >= 0),
  status text not null default 'active' check (status in ('active', 'refunded', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  recipient_name text not null,
  sender_name text not null default '',
  relationship text not null,
  occasion text not null,
  story text not null,
  mood text not null,
  genre text not null,
  lyrics text,
  lyrics_approved boolean not null default false,
  song_url text,
  alternate_song_url text,
  cover_art_url text,
  share_token uuid not null unique default gen_random_uuid(),
  apiframe_task_id text,
  status text not null default 'draft'
    check (status in ('draft', 'generating_lyrics', 'lyrics_ready', 'generating_song', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists songs_user_created_idx on public.songs (user_id, created_at desc);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists songs_status_idx on public.songs (status);

alter table public.orders enable row level security;
alter table public.songs enable row level security;

drop policy if exists "Users can read their orders" on public.orders;
create policy "Users can read their orders"
  on public.orders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their songs" on public.songs;
create policy "Users can read their songs"
  on public.songs for select to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('song-assets', 'song-assets', true, 52428800, array['audio/mpeg', 'image/svg+xml'])
on conflict (id) do update set public = excluded.public;

create or replace function public.claim_song_credit(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_order_id uuid;
begin
  select id into claimed_order_id
  from public.orders
  where user_id = p_user_id
    and status = 'active'
    and credits_used < credits_total
  order by created_at
  for update skip locked
  limit 1;

  if claimed_order_id is null then
    return null;
  end if;

  update public.orders
  set credits_used = credits_used + 1
  where id = claimed_order_id;

  return claimed_order_id;
end;
$$;

create or replace function public.restore_song_credit(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set credits_used = greatest(credits_used - 1, 0)
  where id = p_order_id and status = 'active';
$$;

revoke all on function public.claim_song_credit(uuid) from public, anon, authenticated;
revoke all on function public.restore_song_credit(uuid) from public, anon, authenticated;
grant execute on function public.claim_song_credit(uuid) to service_role;
grant execute on function public.restore_song_credit(uuid) to service_role;