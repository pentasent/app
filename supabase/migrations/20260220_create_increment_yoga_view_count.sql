-- Function to increment yoga view count atomically
create or replace function public.increment_yoga_view_count(yoga_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.yoga_contents
  set views_count = views_count + 1
  where id = yoga_id;
end;
$$;
