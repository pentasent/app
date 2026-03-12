-- The `community_chat_messages` table needs a SELECT policy for authenticated users,
-- otherwise Supabase Realtime will return CHANNEL_ERROR because the subscribing user 
-- is not authorized to read the table.

DO $$
BEGIN
    -- Drop policy if it exists to make this idempotent
    DROP POLICY IF EXISTS "Authenticated users can read community chat messages" ON public.community_chat_messages;
    
    -- Create the SELECT policy
    CREATE POLICY "Authenticated users can read community chat messages"
    ON public.community_chat_messages
    FOR SELECT
    USING (auth.role() = 'authenticated');
    
END $$;
