-- Create the weekly_drops table to track user interactions with Monday Drops
-- This table persists the selected candidate for each user for a specific week

CREATE TABLE IF NOT EXISTS public.weekly_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,  -- Monday date (e.g., 2026-01-05)
    candidate_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Selection metadata
    similarity_score FLOAT,  -- Cosine similarity (0.0-1.0)
    shared_interests_count INTEGER,
    quality_tier TEXT,  -- 'tier_1', 'tier_2', 'tier_3'
    
    -- User interaction
    status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN (
        'shown',        -- Drop was shown to user
        'connected',    -- User clicked "Connect"
        'skipped',      -- User clicked "Skip"
        'hidden',       -- User clicked "Not my type"
        'no_match'      -- No high-quality candidate found for this week
    )),
    
    -- Timestamps
    selected_at TIMESTAMPTZ DEFAULT NOW(),  -- When candidate was selected
    shown_at TIMESTAMPTZ,                   -- When user first saw it
    interacted_at TIMESTAMPTZ,              -- When user took action
    
    -- Constraints
    UNIQUE(user_id, week_start_date),       -- One drop per user per week
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_drops_user_week ON public.weekly_drops(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_drops_candidate ON public.weekly_drops(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_drops_status ON public.weekly_drops(status);

-- Enable Row Level Security
ALTER TABLE public.weekly_drops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own drops
CREATE POLICY "Users can view own weekly drops"
    ON public.weekly_drops
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own drops
CREATE POLICY "Users can insert own weekly drops"
    ON public.weekly_drops
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own drops
CREATE POLICY "Users can update own weekly drops"
    ON public.weekly_drops
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weekly_drops_updated_at
    BEFORE UPDATE ON public.weekly_drops
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
