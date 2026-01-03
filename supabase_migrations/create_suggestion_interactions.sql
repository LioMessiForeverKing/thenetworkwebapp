-- Create the suggestion_interactions table to track user interactions with suggestions
-- This ensures that once a user sends a request or dismisses someone, they don't see them again

CREATE TABLE IF NOT EXISTS suggestion_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggested_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('connected', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only have one interaction per suggested user
    UNIQUE(user_id, suggested_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_suggestion_interactions_user_id ON suggestion_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_interactions_suggested_user_id ON suggestion_interactions(suggested_user_id);

-- Enable Row Level Security
ALTER TABLE suggestion_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own interactions
CREATE POLICY "Users can view own suggestion interactions"
    ON suggestion_interactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own interactions
CREATE POLICY "Users can insert own suggestion interactions"
    ON suggestion_interactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own interactions
CREATE POLICY "Users can update own suggestion interactions"
    ON suggestion_interactions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own interactions
CREATE POLICY "Users can delete own suggestion interactions"
    ON suggestion_interactions
    FOR DELETE
    USING (auth.uid() = user_id);

