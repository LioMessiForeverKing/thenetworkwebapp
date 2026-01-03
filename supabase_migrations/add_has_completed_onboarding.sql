-- Add has_completed_onboarding column to profiles table
-- This column tracks whether a user has completed the onboarding flow
-- Default is false for new users

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Add a comment explaining the column
COMMENT ON COLUMN profiles.has_completed_onboarding IS 'Tracks whether the user has completed the onboarding/wrapped flow. Set to true when user finishes the wrapped presentation.';

-- Create an index for faster lookups (optional but recommended for auth callback queries)
CREATE INDEX IF NOT EXISTS idx_profiles_has_completed_onboarding ON profiles(has_completed_onboarding);

