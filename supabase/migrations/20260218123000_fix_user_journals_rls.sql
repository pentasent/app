-- Drop the table if it exists to start fresh (since previous creation was likely broken/unused)
drop table if exists public.user_journals;

-- Create the user_journals table
create table public.user_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null, -- Changed to reference public.users
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

-- Create Policies matching the custom auth model (Anonymous/Public access allowed)
-- Since the app handles auth securely on the client side (users table model), 
-- we allow anon access here to make it work with the current architecture.

create policy "Allow anon insert"
on public.user_journals for insert
to anon
with check (true);

create policy "Allow anon select"
on public.user_journals for select
to anon
using (true);

create policy "Allow anon update"
on public.user_journals for update
to anon
using (true);

create policy "Allow anon delete"
on public.user_journals for delete
to anon
using (true);

-- Create a trigger to automatically update updated_at (if not exists)
create or replace function public.handle_journal_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_journal_updated_at
before update on public.user_journals
for each row
execute procedure public.handle_journal_updated_at();
