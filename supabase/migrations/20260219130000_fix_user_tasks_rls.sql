-- Drop table to recreate with correct reference and policies
DROP TABLE IF EXISTS public.user_tasks;

-- Create user_tasks table
CREATE TABLE public.user_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES public.user_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    tags TEXT[],
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- Create Policies matching the custom auth model (Anonymous/Public access allowed)
-- Per project architecture: Validation happens on client/API layer as Supabase Auth is not used.

CREATE POLICY "Allow anon insert"
    ON public.user_tasks
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon select"
    ON public.user_tasks
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon update"
    ON public.user_tasks
    FOR UPDATE
    TO anon
    USING (true);

CREATE POLICY "Allow anon delete"
    ON public.user_tasks
    FOR DELETE
    TO anon
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON public.user_tasks(user_id);
