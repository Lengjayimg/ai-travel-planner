-- ==============================================================================
-- WAYFIND TRAVEL PLANNER — SUPABASE DATABASE INITIALIZATION SCRIPT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/idmpjwzizilauidmcrwr/sql
-- ==============================================================================

-- 1. Create public.profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  avatar_url text,
  location text default 'Nigeria',
  travel_style text default 'Art & Culture Explorer',
  trips_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS) on profiles
alter table public.profiles enable row level security;

-- 3. RLS Policies for profiles
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- 4. Automatic User Sync Trigger
-- Automatically creates a profile record whenever a new user signs up via auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', null),
    coalesce(new.raw_user_meta_data->>'location', 'Nigeria')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    email = excluded.email,
    updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it already exists to avoid errors on re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Backfill existing users who signed up before this script was executed
insert into public.profiles (id, full_name, email, avatar_url, location)
select 
  id,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email,
  coalesce(raw_user_meta_data->>'avatar_url', null),
  coalesce(raw_user_meta_data->>'location', 'Nigeria')
from auth.users
on conflict (id) do nothing;

-- 6. Create public.saved_trips table for cloud itinerary persistence
create table if not exists public.saved_trips (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  destination text not null,
  dates text,
  duration text,
  travelers text,
  travel_style text,
  budget_total_usd numeric,
  budget_total_ngn numeric,
  status text default 'Active Itinerary',
  cover_image text,
  itinerary_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Enable RLS on saved_trips
alter table public.saved_trips enable row level security;

-- Policies for saved_trips: Users can read, insert, update, delete only their own trips
drop policy if exists "Users can view their own trips" on public.saved_trips;
create policy "Users can view their own trips"
  on public.saved_trips
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own trips" on public.saved_trips;
create policy "Users can insert their own trips"
  on public.saved_trips
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own trips" on public.saved_trips;
create policy "Users can update their own trips"
  on public.saved_trips
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own trips" on public.saved_trips;
create policy "Users can delete their own trips"
  on public.saved_trips
  for delete
  using (auth.uid() = user_id);
