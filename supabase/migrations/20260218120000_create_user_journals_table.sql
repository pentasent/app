-- Create the user_journals table if it doesn't exist
create table if not exists public.user_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  content text not null,
  tags text[],
  mood_label text,
  mood_emoji text,
  mood_intensity integer check (mood_intensity >= 1 and mood_intensity <= 10),
  energy_level integer check (energy_level >= 1 and energy_level <= 10),
  is_favorite boolean default false,
  is_private boolean default true,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.user_journals enable row level security;

-- Create Policies

-- Allow users to view their own journals
create policy "Users can view own journals"
on public.user_journals for select
using (auth.uid() = user_id);

-- Allow users to insert their own journals
create policy "Users can insert own journals"
on public.user_journals for insert
with check (auth.uid() = user_id);

-- Allow users to update their own journals
create policy "Users can update own journals"
on public.user_journals for update
using (auth.uid() = user_id);

-- Allow users to delete (or soft delete) their own journals
create policy "Users can delete own journals"
on public.user_journals for delete
using (auth.uid() = user_id);

-- Create a trigger to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at
before update on public.user_journals
for each row
execute procedure public.handle_updated_at();
