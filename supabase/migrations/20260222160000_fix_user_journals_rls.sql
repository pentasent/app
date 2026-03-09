-- Drop the restrictive anon-only policies from the old custom auth system
drop policy if exists "Allow anon insert" on public.user_journals;
drop policy if exists "Allow anon select" on public.user_journals;
drop policy if exists "Allow anon update" on public.user_journals;
drop policy if exists "Allow anon delete" on public.user_journals;

-- Create secure policies for true Supabase Auth (authenticated roles)
create policy "Users can view own journals"
on public.user_journals for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own journals"
on public.user_journals for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own journals"
on public.user_journals for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own journals"
on public.user_journals for delete
to authenticated
using (user_id = auth.uid());
