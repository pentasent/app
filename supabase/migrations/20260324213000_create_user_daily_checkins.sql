-- Create user_daily_checkins table
create table public.user_daily_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,

  mood_score int check (mood_score between 1 and 5),
  energy_level int check (energy_level between 1 and 5),
  stress_level int check (stress_level between 1 and 5),
  sleep_quality int check (sleep_quality between 1 and 5),

  mood_tag text, -- happy, calm, neutral, sad, anxious, tired
  notes text,

  suggested_action text, -- meditate, journal, read, listen, breathe, chat
  suggested_content_id uuid,

  checkin_date date default current_date,
  created_at timestamp with time zone default now(),

  unique(user_id, checkin_date)
);

-- Enable RLS
alter table public.user_daily_checkins enable row level security;

-- Policies
create policy "Users can view their own checkins"
  on public.user_daily_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert their own checkins"
  on public.user_daily_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own checkins"
  on public.user_daily_checkins for update
  using (auth.uid() = user_id);

create policy "Users can delete their own checkins"
  on public.user_daily_checkins for delete
  using (auth.uid() = user_id);
