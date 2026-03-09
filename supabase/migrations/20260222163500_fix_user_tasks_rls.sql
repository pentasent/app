-- Fix RLS Policies for user_tasks
-- The previous policies allowed only 'anon' access which blocks authenticated users.

-- 1. Drop existing anon policies
DROP POLICY IF EXISTS "Allow anon insert" ON public.user_tasks;
DROP POLICY IF EXISTS "Allow anon select" ON public.user_tasks;
DROP POLICY IF EXISTS "Allow anon update" ON public.user_tasks;
DROP POLICY IF EXISTS "Allow anon delete" ON public.user_tasks;

-- 2. Create new policies for authenticated users
-- Users can only select their own tasks
CREATE POLICY "Users can view own tasks"
ON public.user_tasks FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can only insert tasks where user_id matches their own auth.uid()
CREATE POLICY "Users can insert own tasks"
ON public.user_tasks FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can only update their own tasks
CREATE POLICY "Users can update own tasks"
ON public.user_tasks FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own tasks
CREATE POLICY "Users can delete own tasks"
ON public.user_tasks FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Enable RLS (just in case it was disabled)
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
