-- Fix unique constraint for community_chat_read_status
-- This is required for the upsert operation in the app
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'community_chat_read_status_chat_id_user_id_key'
    ) THEN
        ALTER TABLE public.community_chat_read_status
        ADD CONSTRAINT community_chat_read_status_chat_id_user_id_key UNIQUE (chat_id, user_id);
    END IF;
END $$;

-- Ensure RLS policies for community_chat_read_status allow upsert
-- This typically requires a combination of INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users can manage their own read status" ON public.community_chat_read_status;
CREATE POLICY "Users can manage their own read status"
ON public.community_chat_read_status
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for community_chat_messages
-- This resolves the CHANNEL_ERROR / TIMED_OUT issues
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'community_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.community_chat_messages;
    END IF;
END $$;
