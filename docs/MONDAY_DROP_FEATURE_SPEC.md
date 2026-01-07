# Feature Specification: Monday Drop
## Weekly High-Quality Connection Recommendation System

**Version:** 1.1  
**Date:** January 2025  
**Status:** Specification Document  
**Owner:** Ayen / PM

**Changelog v1.1:**
- Clarified pull-based timing (render-time, not batch jobs)
- Fixed "no match" persistence (now persists row with status='no_match')
- Fixed similarity + tier filtering logic contradiction
- Made shared interests a soft ranker (≥1) instead of hard filter (≥2)
- Marked eligibility check as placeholder (schema-dependent)
- Codified state transitions in "Canonical Behavior" section
- Clarified >4 connections as heuristic, not hard rule
- Added pgvector 3072-dimension assumption note
- Minor tone and specificity improvements

---

## Executive Summary

**Monday Drop** is a weekly retention feature that delivers exactly one high-quality, high-fidelity connection recommendation every Monday. The feature appears in the rm message surface (the post-onboarding state) and creates a weekly engagement loop by providing rare, curated matches.

**Core Principle:** Quality over quantity. One perfect match is better than ten mediocre ones.

### Critical Clarifications

#### 1. This is an ADDITION, Not a Replacement

**Monday Drop is ADDITIONAL to the existing 3 suggestions flow.**
- ✅ New account connections (3 suggestions) still work exactly as before
- ✅ Monday Drop appears for users who have already seen their initial 3 suggestions
- ✅ Both features can coexist - they serve different purposes
- ✅ Monday Drop is a weekly retention feature, not a replacement for onboarding

#### 2. Same UI/UX Pattern

**Monday Drop uses the EXACT SAME UI/UX as the existing 3 suggestions flow.**

- ✅ Same connection card component
- ✅ Same rm message surface
- ✅ Same behavior: when connection is made, message disappears
- ✅ Same visual design and layout
- ✅ No new UI components needed

**The only differences:**
- One person instead of three
- Weekly instead of one-time
- Header says "Your Monday Drop" instead of "Ari's Suggestions"

**Key Rule:** Message and connection don't mix. When a connection appears, the message disappears. This is the same behavior as the 3 suggestions flow.

### Canonical Behavior

**Starting Monday 8:00 AM local time, each user is eligible for at most one Monday Drop for that week.**

**On first eligible app open that week, the system either:**
1. Selects and persists one candidate, OR
2. Persists a "no match" result for that week

**The same result is shown for the rest of the week.**

**State Transitions:**
- **If Monday Drop candidate exists and status is 'shown'** → Render candidate card, hide rm text
- **If status is 'connected'|'skipped'|'hidden'|'no_match'** → Render rm text only (with appropriate copy), hide candidate card
- **Any user action (connect/skip/hide)** → Updates status, ends Monday Drop display until next week

---

## 1. Goals & Objectives

### Primary Goals
1. **Weekly Retention Loop**: Create a reason for users to return every Monday
2. **High-Quality Connections**: Only show matches that meet strict similarity thresholds
3. **Scarcity Creates Value**: Make each drop feel rare and special
4. **Reduce Decision Fatigue**: One choice, not ten

### Success Metrics
- **Weekly Drop View → Connect Rate**: Target 40%+ connection rate
- **Week-over-Week Return Rate**: Users who saw a drop return the following Monday
- **Skip vs Connect Ratio**: Quality signal (fewer skips = better matching)
- **Time to Connect**: How quickly users act on the drop
- **Long-term Engagement**: Users who engage with Monday Drops show higher overall retention

### Anti-Goals (What We're NOT Doing)
- ❌ Filling the week with multiple drops if quality is low
- ❌ Showing low-fidelity matches just to have something
- ❌ Creating notification spam
- ❌ Replacing the initial 3-suggestion flow (Monday Drop is ADDITIONAL)
- ❌ Interfering with new account onboarding connections

---

## 2. User Experience

### 2.1 Where It Appears

**Surface:** rm message UI (the post-onboarding / existing-account state)

**Contexts:**
- User who has completed initial onboarding suggestions (Monday Drop appears AFTER they've seen their initial 3)
- **Heuristic:** Existing user with >4 connections (no longer sees the "3 suggestions" flow)
- Any user in the post-onboarding state

**Eligibility Rule:**
- **Primary:** User has completed initial 3 suggestions (ideal: track `has_completed_initial_suggestions` flag)
- **Fallback heuristic:** `connections_count > 4` (proxy for post-onboarding)
- If neither condition is met, user sees initial 3 suggestions instead

**Important:** The initial 3 suggestions for new accounts still work exactly as before. Monday Drop is an ADDITIONAL feature that appears after onboarding is complete. New users will see:
1. First: Their initial 3 suggestions (existing flow)
2. Later: Monday Drop appears weekly (new feature)

**Important:** Monday Drop uses the **EXACT SAME UI/UX** as the existing 3 suggestions flow. It's not a different pattern - it's the same connection card component, same rm message surface, same behavior. The only differences are:
- One person instead of three
- Weekly instead of one-time
- Header says "Your Monday Drop" instead of "Ari's Suggestions"

**Visual Placement:**
- Uses the same connection card component as the 3 suggestions
- Appears in the same rm message surface
- When connection is made, message disappears (same behavior as 3 suggestions)
- Message and connection don't mix - when connection appears, message disappears

### 2.2 When It Appears

**Timing:**
- **Eligible starting Monday 8:00 AM local time; surfaced on first app open after that**
- System is **pull-based (render-time)** - no batch jobs or push notifications in v1
- Once shown, persists throughout the week until user interacts with it
- Does NOT auto-replace if dismissed (waits until next Monday)

**Week Definition:**
- Week starts: Monday 8:00 AM (user's local timezone)
- Week ends: Sunday 23:59 (user's local timezone)
- Each week gets exactly one drop (or a "no match" result if no high-quality match exists)

**Timezone Handling:**
- Use user's local timezone (detect from browser/device via `Intl.DateTimeFormat().resolvedOptions().timeZone`)
- If timezone detection is unavailable or too complex, fallback to UTC 8:00 AM
- Goal: Everyone sees their Monday Drop in their morning (around 8am local time)
- Implementation: Calculate "Monday 8am" in user's timezone, show drop after that time on first app open

### 2.3 What the User Sees

#### Default State (Monday Drop Available)

**Header Section:**
```
Your Monday Drop
One high-fit person this week.
```

**Connection Card:**
- **Uses the EXACT SAME connection card component as the 3 suggestions flow**
- Same avatar, name, compatibility badge, shared interests, "why" line
- Same action buttons (Connect, Skip, etc.)
- Same visual design and layout
- **No new UI components needed** - reuse existing connection card

**Key Point:** The connection card is identical to what users see in the 3 suggestions. The only difference is the header text ("Your Monday Drop" vs "Ari's Suggestions") and the fact that there's one card instead of three.

#### Skip State (User Dismissed)

**Message:**
```
Monday Drop dismissed.
Next one arrives Monday.
```

**Visual:**
- **Message disappears** (same behavior as 3 suggestions when dismissed)
- No card shown
- Clear indication of when next drop arrives
- **Important:** Message disappears when dismissed, just like 3 suggestions

#### No Match State (No High-Quality Candidate)

**Message:**
```
Your Monday Drop

None this week — we're keeping quality high.
Check back next Monday.
```

**Visual:**
- Empty state design
- Reassures user that quality is prioritized
- Sets expectation for next week

### 2.4 User Actions & Outcomes

#### Connect Action
- **What happens**: Sends friend request / initiates connection
- **Outcome**: 
  - **Message disappears** (same behavior as 3 suggestions flow)
  - Connection appears in network (same as 3 suggestions)
  - Drop is marked as "connected" in system
  - **Important:** Message and connection don't mix - when connection is made, rm message disappears
- **Tracking**: Logged as successful connection

#### Skip Action
- **What happens**: Dismisses the drop for the week
- **Outcome**:
  - Card disappears
  - Message confirms dismissal
  - Drop is marked as "skipped" in system
  - No replacement shown until next Monday
- **Tracking**: Logged as skip (quality signal)

#### "Not My Type" Action (Optional)
- **What happens**: User explicitly rejects the match
- **Outcome**:
  - Card disappears
  - User is hidden from future drops (or downvoted)
  - System learns from this feedback
- **Tracking**: Logged as negative feedback (training signal)

---

## 3. Quality Rules & Constraints

### 3.1 Hard Constraints (Must-Have)

A Monday Drop candidate **MUST** meet all of these criteria:

1. **Not Already Connected**
   - User is not already connected to candidate
   - No pending friend request exists (either direction)
   - **Implementation:** Use existing connections/friend requests tables (see actual schema for column names - may be `sender_id`/`receiver_id` or `user_a`/`user_b` depending on your schema)

2. **Not Previously Shown**
   - Candidate has never been shown to this user in any previous Monday Drop
   - Check `weekly_drops` table for historical records
   - Prevents repetition and maintains freshness

3. **Not Blocked/Hidden**
   - User has not blocked the candidate
   - Candidate has not blocked the user
   - User has not previously marked candidate as "not my type"
   - Check `blocked_users` or equivalent table

4. **Meets High Similarity Threshold**
   - **DNA v2 Similarity**: ≥75% cosine similarity on `composite_vector` (primary gate)
   - **DNA v1 Fallback**: ≥75% cosine similarity on `interest_vector` (if v2 not available)
   - **Shared Interests**: Used as soft ranker (more shared interests = higher rank), not hard filter
     - Early-stage: ≥1 shared interest (to prevent too many "no drop" weeks)
     - Later: Can tighten to ≥2 if user base grows and taxonomy stabilizes
   - **Minimum Threshold**: Never go below 70% similarity (hard floor, only for Tier 1 candidates)

### 3.2 Scarcity Rule (Quality Over Quantity)

**Core Principle:** If no candidate meets the high-fidelity threshold, show **NO drop**.

**Implementation:**
- System queries for candidates meeting all hard constraints
- Filters by similarity threshold (≥75% primary, ≥70% minimum for Tier 1 only)
- If zero candidates found → Persist "no match" result (see persistence section)
- **Never** "fill" with low-fidelity matches just to have something
- **Never** lower the threshold to meet a quota

**Rationale:**
- Scarcity creates value
- One perfect match is better than ten mediocre ones
- Users will appreciate the quality over time
- Better to skip a week than show a bad match

**Important:** Even when no candidate is found, we **persist a "no match" row** in `weekly_drops` with `candidate_user_id = NULL` and `status = 'no_match'`. This prevents:
- Repeated expensive selection attempts every app open that week
- Analytics confusion (we can track "no match" weeks accurately)
- Non-deterministic behavior

### 3.3 Optional Fairness Rules (Future Refinement)

**Problem:** Avoid repeatedly surfacing the same small group of users to everyone

**Potential Solutions:**
- **Rotation Cap**: Limit how many times a user can be shown as a Monday Drop candidate per month
- **Exposure Distribution**: Ensure popular users don't dominate all drops
- **Geographic Diversity**: Rotate across different locations (if relevant)
- **Interest Diversity**: Rotate across different interest categories

**Note:** These are **future refinements**, not required for v1. Start simple, add complexity later.

### 3.4 Quality Tiers (Internal Classification)

For internal tracking and future optimization:

**Tier 1 (Ideal):**
- ≥85% similarity
- 3+ shared interests (soft ranker, not hard filter)
- Strong compatibility signals

**Tier 2 (Good):**
- 75-84% similarity
- 2+ shared interests (soft ranker)
- Good compatibility signals

**Tier 3 (Not used in v1):**
- 70-74% similarity
- Reserved for future use if needed
- **Current policy:** If no Tier 1 or Tier 2 candidates exist, show "no match" instead

**Selection Logic:**
1. Filter: similarity >= 0.75 AND shared_interests_count >= 1
2. Rank by:
   - Quality tier (Tier 1 > Tier 2)
   - Similarity score (descending)
   - Shared interests count (descending)
3. Select top candidate, or persist "no match" if none found

**Note:** Tier is metadata for analytics/ranking, not a separate filter. The primary gate is similarity >= 0.75.

---

## 4. Behavioral Logic & Selection Algorithm

### 4.1 Weekly Selection Process

#### Step 1: Week Identification
```
week_key = Monday date (e.g., "2026-01-05")
week_start = Monday 00:00 (user's timezone)
week_end = Sunday 23:59 (user's timezone)
```

#### Step 2: Check Existing Drop
```
IF user already has a drop for this week_key:
  → Show persisted drop
  → Skip selection process
ELSE:
  → Proceed to selection
```

#### Step 3: Candidate Pool Generation
```
1. Get all users from profiles table
2. Filter out:
   - Already connected users
   - Previously shown users (from weekly_drops history)
   - Blocked/hidden users
   - Users without DNA v2 (or v1 fallback)
3. Result: Candidate pool
```

#### Step 4: Similarity Calculation
```
FOR each candidate in pool:
  1. Get user's DNA v2 composite_vector (or v1 interest_vector)
  2. Get candidate's DNA v2 composite_vector (or v1 interest_vector)
  3. Calculate cosine similarity
  4. Count shared interests
  5. Classify into quality tier
```

#### Step 5: Filtering & Ranking
```
1. Filter candidates by:
   - Similarity >= 0.75 (primary gate)
   - Shared interests >= 1 (soft ranker, not hard filter)
2. Classify into quality tiers:
   - Tier 1: similarity >= 0.85
   - Tier 2: similarity >= 0.75 AND < 0.85
3. Rank by:
   - Quality tier (Tier 1 > Tier 2)
   - Similarity score (descending)
   - Shared interests count (descending)
4. Result: Ranked candidate list
```

#### Step 6: Selection
```
IF ranked list is empty:
  → Persist "no match" result (candidate_user_id = NULL, status = 'no_match')
  → Show empty state
ELSE:
  → Select top candidate
  → Persist to weekly_drops table (status = 'shown')
  → Show to user
```

### 4.2 Persistence Logic

**Storage:**
- Store selected candidate in `weekly_drops` table
- Key fields: `user_id`, `week_start_date`, `candidate_user_id`, `status`
- **Critical:** Even "no match" results are persisted (candidate_user_id = NULL, status = 'no_match')
- Ensures consistent experience across sessions and devices

**State Management:**
- Once a drop is selected (or "no match" is determined) for a week, it's locked in
- User sees the same result every time they open the app that week
- Prevents repeated expensive selection attempts
- Only changes if user takes action (connect, skip, hide) - which updates status but doesn't trigger new selection

### 4.3 Edge Cases & Special Scenarios

#### Case 1: User Opens App Multiple Times in Same Week
- **Behavior**: Show same persisted drop each time
- **Implementation**: Check `weekly_drops` for existing entry for this week

#### Case 2: User Skips, Then Reopens App Same Week
- **Behavior**: Show "Monday Drop dismissed" message
- **Implementation**: Check status = 'skipped' in `weekly_drops`

#### Case 3: User Connects, Then Reopens App Same Week
- **Behavior**: Show "Request Sent" or "Connected" state
- **Implementation**: Check status = 'connected' in `weekly_drops`, verify connection status

#### Case 4: No High-Quality Match Exists
- **Behavior**: Show "No Monday Drop this week" message
- **Implementation**: Persist `weekly_drops` entry with `candidate_user_id = NULL` and `status = 'no_match'`
- **Why persist:** Prevents re-running expensive selection on every app open, enables accurate analytics

#### Case 5: User Timezone Changes
- **Behavior**: Use user's current timezone to determine week boundaries
- **Implementation**: Calculate week_start_date based on user's timezone

#### Case 6: User Has Very Few Users in System
- **Behavior**: May result in "No drop" more frequently
- **Implementation**: Acceptable - quality over quantity

#### Case 7: Candidate Becomes Unavailable After Selection
- **Scenario**: Candidate blocks user, or connection is made outside Monday Drop
- **Behavior**: Show "No Monday Drop this week" (candidate no longer valid)
- **Implementation**: Re-validate candidate on each render

---

## 5. Data Model

### 5.1 New Table: `weekly_drops`

```sql
CREATE TABLE public.weekly_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,  -- Monday date (e.g., 2026-01-05)
    candidate_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Selection metadata
    similarity_score FLOAT,  -- Cosine similarity (0.0-1.0)
    shared_interests_count INTEGER,
    quality_tier TEXT,  -- 'tier_1', 'tier_2', 'tier_3'
    
    -- User interaction
    status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN (
        'shown',        -- Drop was shown to user
        'connected',    -- User clicked "Connect"
        'skipped',      -- User clicked "Skip"
        'hidden'        -- User clicked "Not my type"
    )),
    
    -- Timestamps
    selected_at TIMESTAMPTZ DEFAULT NOW(),  -- When candidate was selected
    shown_at TIMESTAMPTZ,  -- When user first saw it
    interacted_at TIMESTAMPTZ,  -- When user took action
    
    -- Constraints
    UNIQUE(user_id, week_start_date),  -- One drop per user per week
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weekly_drops_user_week ON public.weekly_drops(user_id, week_start_date);
CREATE INDEX idx_weekly_drops_candidate ON public.weekly_drops(candidate_user_id);
CREATE INDEX idx_weekly_drops_status ON public.weekly_drops(status);
```

### 5.2 Existing Tables Used

**`profiles`**
- User information, interests, DNA vectors

**`digital_dna_v2`** (or `digital_dna_v1`)
- `composite_vector` or `interest_vector` for similarity calculation

**`user_connections`**
- Check for existing connections (status = 'accepted')

**`friend_requests`**
- Check for pending requests (status = 'pending')

**`blocked_users`** (or equivalent)
- Check for blocked/hidden relationships

### 5.3 Query Patterns

#### Get Current Week's Drop
```sql
SELECT * FROM weekly_drops
WHERE user_id = $1
  AND week_start_date = $2  -- Current week's Monday date
LIMIT 1;
```

#### Check if Candidate Was Previously Shown
```sql
SELECT COUNT(*) FROM weekly_drops
WHERE user_id = $1
  AND candidate_user_id = $2;
```

#### Get Historical Drops (for analytics)
```sql
SELECT * FROM weekly_drops
WHERE user_id = $1
ORDER BY week_start_date DESC;
```

---

## 6. Copy & Messaging

### 6.1 Default State (Drop Available)

**Header:**
```
Your Monday Drop
```

**Subtext:**
```
One high-fit person this week.
```

**Alternative Subtexts (for variety):**
- "One high-fit person this week. Rare on purpose."
- "One carefully matched connection, just for you."
- "Quality over quantity. One perfect match."

**Card CTA:**
```
Connect
```

### 6.2 Skip State

**Message:**
```
Monday Drop dismissed.
Next one arrives Monday.
```

**Alternative:**
```
Skipped. See you next Monday.
```

### 6.3 No Match State

**Header:**
```
Your Monday Drop
```

**Body:**
```
None this week — we're keeping quality high.
Check back next Monday.
```

**Alternative:**
```
No drop this week.
We'd rather show you nothing than a mediocre match.
Next one arrives Monday.
```

### 6.4 Connected State

**Message:**
```
Request sent! We'll let you know when they respond.
```

**Alternative:**
```
Connected! Start a conversation.
```

### 6.5 Tone Guidelines

- **Confident but not arrogant**: "We're keeping quality high"
- **Scarcity without desperation**: "Rare on purpose"
- **Clear expectations**: Always mention "next Monday"
- **User-centric**: Focus on value to user, not system constraints

---

## 7. Success Metrics & Analytics

### 7.1 Primary Metrics

#### Weekly Drop View → Connect Rate
- **Definition**: % of users who see a drop and click "Connect"
- **Target**: 40%+ connection rate
- **Calculation**: `(connected_count / shown_count) * 100`
- **Tracking**: Log every "Connect" action vs "shown" status

#### Week-over-Week Return Rate
- **Definition**: % of users who saw a drop one week and return the following Monday
- **Target**: 60%+ return rate
- **Calculation**: Users who saw drop in week N and opened app in week N+1
- **Tracking**: Compare `weekly_drops` entries across consecutive weeks

#### Skip vs Connect Ratio
- **Definition**: Ratio of skips to connects (quality signal)
- **Target**: <1.5 skips per connect (more connects than skips)
- **Calculation**: `skip_count / connect_count`
- **Interpretation**: Lower ratio = better matching quality

### 7.2 Secondary Metrics

#### Time to Connect
- **Definition**: Time between drop shown and "Connect" clicked
- **Tracking**: `interacted_at - shown_at` for status = 'connected'
- **Insight**: Faster = more compelling match

#### Quality Tier Distribution
- **Definition**: % of drops in each quality tier (Tier 1, 2, 3)
- **Target**: 70%+ in Tier 1, 25%+ in Tier 2, <5% in Tier 3
- **Tracking**: Aggregate `quality_tier` field

#### "No Drop" Frequency
- **Definition**: % of weeks where no high-quality match exists
- **Tracking**: Weeks where user opened app but no drop was shown
- **Insight**: System health indicator (too high = need more users or lower threshold)

#### Long-term Engagement Impact
- **Definition**: Overall app retention for users who engage with Monday Drops vs those who don't
- **Tracking**: Compare retention curves
- **Target**: Monday Drop users show 2x+ retention vs non-engagers

### 7.3 Analytics Events to Track

**Event: `monday_drop_shown`**
```json
{
  "user_id": "uuid",
  "week_start_date": "2026-01-05",
  "candidate_user_id": "uuid",
  "similarity_score": 0.87,
  "quality_tier": "tier_1",
  "shared_interests_count": 3
}
```

**Event: `monday_drop_connected`**
```json
{
  "user_id": "uuid",
  "week_start_date": "2026-01-05",
  "candidate_user_id": "uuid",
  "time_to_connect_ms": 45000
}
```

**Event: `monday_drop_skipped`**
```json
{
  "user_id": "uuid",
  "week_start_date": "2026-01-05",
  "candidate_user_id": "uuid",
  "time_to_skip_ms": 12000
}
```

**Event: `monday_drop_hidden`**
```json
{
  "user_id": "uuid",
  "week_start_date": "2026-01-05",
  "candidate_user_id": "uuid"
}
```

**Event: `monday_drop_no_match`**
```json
{
  "user_id": "uuid",
  "week_start_date": "2026-01-05",
  "reason": "no_high_quality_candidates"
}
```

---

## 8. Implementation Considerations

### 8.1 Performance

**Selection Timing:**
- Selection can happen on-demand (when user opens app) or pre-computed (Sunday night batch job)
- **Recommendation**: Pre-compute on Sunday night for better UX (instant load)

**Similarity Calculation:**
- DNA v2 vectors are 3072 dimensions - cosine similarity is computationally expensive
- **Note:** 3072 dimensions may exceed pgvector index limits (HNSW/IVFFlat typically support up to 2000 dimensions)
- **v1 Approach:** Use brute-force similarity over a filtered pool (shared-interest prefilter), indexed optimization later
- **Optimization**: Use pgvector's built-in similarity functions where possible, consider caching

**Candidate Pool Size:**
- As user base grows, candidate pool grows
- **Optimization**: Pre-filter by shared interests before calculating full similarity

### 8.2 Scalability

**Database Load:**
- Weekly selection for all active users could be heavy
- **Solution**: Batch processing, distributed across time, use background jobs

**Vector Search:**
- pgvector similarity search can be slow on large datasets
- **Solution**: Use vector indexes (HNSW/IVFFlat), though note 3072 dimensions may exceed index limits

### 8.3 User Experience

**Loading States:**
- Selection might take a few seconds
- **Solution**: Show skeleton/loading state, pre-compute when possible

**Offline Handling:**
- What if user opens app offline on Monday?
- **Solution**: Pre-compute and cache, show cached drop if available

**Timezone Handling:**
- Users in different timezones have different "Mondays" and different "8am" times
- **Solution**: 
  - Detect user's timezone from browser: `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - Calculate "Monday 8:00 AM" in user's local timezone
  - If timezone detection fails or is too complex, fallback to UTC 8:00 AM
  - Goal: Everyone sees Monday Drop in their morning (around 8am local time)
  - Store timezone in user profile or session for consistency

### 8.4 A/B Testing Opportunities

**Copy Variations:**
- Test different header/subtext combinations
- Test "Rare on purpose" vs "One perfect match" messaging

**Quality Thresholds:**
- Test 75% vs 80% similarity thresholds
- Test impact on "No drop" frequency vs connection rate

**Visual Design:**
- Test card layouts, star ratings vs percentages
- Test number of shared interest tags shown

**Action Buttons:**
- Test "Connect" vs "Send Request" vs "Add Friend"
- Test presence/absence of "Not my type" button

---

## 9. Future Enhancements (Post-v1)

### 9.1 Personalization
- Learn from user's skip/connect patterns to improve future selections
- Adjust similarity thresholds based on user's historical preferences
- Consider user's connection history (do they prefer high similarity or diversity?)

### 9.2 Proactive Features
- Stella could mention Monday Drop in conversation: "Your Monday Drop is ready!"
- Push notification on Monday morning: "Your Monday Drop is here"
- Email digest: "Here's your Monday Drop for this week"

### 9.3 Social Features
- "Your network's Monday Drops" - see who your connections matched with
- Shared interest discovery: "3 people in your network got drops related to [interest]"

### 9.4 Quality Improvements
- Machine learning model to predict connection success
- Feedback loop: Learn from which drops lead to actual conversations
- Dynamic threshold adjustment based on user base growth

### 9.5 Advanced Matching
- Consider temporal patterns (when users are most active)
- Consider network effects (mutual connections)
- Consider behavioral signals (recent activity, engagement patterns)

---

## 10. Open Questions & Decisions Needed

### 10.1 Technical Decisions
- [ ] Pre-compute drops (Sunday night) vs on-demand (Monday morning)?
- [ ] Use DNA v2 composite_vector or interest_vector for similarity?
- [ ] What's the exact similarity threshold? (75%? 80%? Configurable?)
- [ ] How to handle users without DNA v2? (Fallback to v1? Skip them?)
- [x] **Timezone handling: Use browser timezone detection (Intl API), fallback to UTC if unavailable**
- [x] **Timing: Monday 8:00 AM in user's local timezone (PST, EST, UTC, etc.)**

### 10.2 Product Decisions
- [ ] Should "Not my type" button be in v1 or future?
- [ ] Should we show similarity percentage or just star rating?
- [ ] How many shared interest tags to show? (1-2? More?)
- [ ] Should "why" line be AI-generated or template-based?

### 10.3 Design Decisions
- [x] **Card design: REUSE existing connection card component from 3 suggestions flow** (no new design needed)
- [ ] Empty state design: How to make "no drop" feel positive?
- [ ] Loading states: How to handle selection delay?
- [x] **Mobile vs desktop: Same as 3 suggestions flow** (already handled)

### 10.4 Business Decisions
- [ ] Should Monday Drop be available to all users or premium feature?
- [ ] What's the minimum user base size needed for this to work?
- [ ] How to handle users who never get drops (too few candidates)?

---

## 11. Risks & Mitigations

### 11.1 Risk: Too Many "No Drop" Weeks
**Impact**: Users lose interest if they never see drops  
**Mitigation**: 
- Monitor "no drop" frequency closely
- Consider lowering threshold slightly if too frequent
- Communicate value: "We're keeping quality high"

### 11.2 Risk: Low Connection Rate
**Impact**: Feature doesn't achieve retention goal  
**Mitigation**:
- A/B test different similarity thresholds
- Improve "why" line generation (more compelling)
- Test different visual designs

### 11.3 Risk: Performance Issues
**Impact**: Slow selection, poor UX  
**Mitigation**:
- Pre-compute drops in background
- Optimize vector similarity calculations
- Cache results aggressively

### 11.4 Risk: User Confusion
**Impact**: Users don't understand the feature  
**Mitigation**:
- Clear copy: "One high-fit person this week"
- Onboarding tooltip for first-time users
- Help documentation

---

## 12. Dependencies & Prerequisites

### 12.1 Technical Dependencies
- ✅ DNA v2 (or v1) system must be functional
- ✅ Similarity calculation infrastructure
- ✅ User connections/friend requests system
- ✅ rm message UI surface exists

### 12.2 Data Dependencies
- ✅ Sufficient user base (need candidates to match against)
- ✅ Users have DNA vectors computed
- ✅ Connection/blocking system in place

### 12.3 Design Dependencies
- ✅ **Card component: REUSE existing connection card from 3 suggestions** (no new design needed)
- Empty state design (for "no drop" scenario)
- Loading state design (if needed)
- Copy finalized

---

## 13. Launch Plan

### 13.1 Phased Rollout

**Phase 1: Internal Testing (Week 1)**
- Build feature with test data
- Internal team testing
- Fix bugs, refine UX

**Phase 2: Beta Testing (Week 2-3)**
- Roll out to 10% of users
- Monitor metrics closely
- Gather feedback

**Phase 3: Gradual Rollout (Week 4+)**
- Increase to 25%, then 50%, then 100%
- Monitor performance and metrics
- Iterate based on data

### 13.2 Launch Checklist

**Technical:**
- [ ] Database migration for `weekly_drops` table
- [ ] Selection algorithm implemented
- [ ] Similarity calculation optimized
- [ ] Persistence logic working
- [ ] Timezone detection and 8am local time logic implemented
- [ ] Analytics events tracked

**Product:**
- [ ] Copy finalized
- [ ] Design approved
- [ ] Edge cases handled
- [ ] Success metrics dashboard ready

**Communication:**
- [ ] In-app announcement (first Monday)
- [ ] Help documentation updated
- [ ] Support team briefed

---

## 14. Implementation Plan

### 14.1 Overview

This section provides a step-by-step implementation plan for Monday Drop. The feature will be built incrementally, starting with the database layer and working up to the UI.

**Estimated Timeline:** 2-3 weeks
**Complexity:** Medium
**Dependencies:** Existing DNA matching system, rm message UI surface

---

### 14.2 Phase 1: Database & Backend Foundation (Week 1, Days 1-3)

#### Step 1.1: Database Migration

**Task:** Create `weekly_drops` table

**File:** `supabase/migrations/[timestamp]_create_weekly_drops.sql`

**SQL:**
```sql
-- Create weekly_drops table
CREATE TABLE IF NOT EXISTS public.weekly_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,  -- Monday date (e.g., 2026-01-05)
    candidate_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Selection metadata
    similarity_score FLOAT,  -- Cosine similarity (0.0-1.0)
    shared_interests_count INTEGER,
    quality_tier TEXT,  -- 'tier_1', 'tier_2', 'tier_3'
    
    -- User interaction
    status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN (
        'shown',        -- Drop was shown to user
        'connected',    -- User clicked "Connect"
        'skipped',      -- User clicked "Skip"
        'hidden'        -- User clicked "Not my type"
    )),
    
    -- Timestamps
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    shown_at TIMESTAMPTZ,
    interacted_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, week_start_date),  -- One drop per user per week
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weekly_drops_user_week ON public.weekly_drops(user_id, week_start_date);
CREATE INDEX idx_weekly_drops_candidate ON public.weekly_drops(candidate_user_id);
CREATE INDEX idx_weekly_drops_status ON public.weekly_drops(status);

-- RLS Policies
ALTER TABLE public.weekly_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly drops"
    ON public.weekly_drops
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly drops"
    ON public.weekly_drops
    FOR UPDATE
    USING (auth.uid() = user_id);
```

**Acceptance Criteria:**
- [ ] Table created successfully
- [ ] Indexes created
- [ ] RLS policies working
- [ ] Migration tested in local Supabase

---

#### Step 1.2: Helper Functions & RPCs

**Task:** Create database functions for Monday Drop logic

**File:** `supabase/migrations/[timestamp]_create_monday_drop_functions.sql`

**Functions Needed:**

1. **`get_monday_drop_for_user(user_id UUID, week_date DATE)`**
   - Returns existing drop for user/week if exists
   - Returns NULL if no drop exists

2. **`check_candidate_eligibility(user_id UUID, candidate_id UUID)`**
   - Checks if candidate is eligible (not connected, not previously shown, not blocked)
   - Returns boolean

3. **`get_previous_drops(user_id UUID)`**
   - Returns list of candidate_user_ids that were previously shown
   - Used to filter out repeats

**SQL Template:**
```sql
-- Function to get existing drop
CREATE OR REPLACE FUNCTION get_monday_drop_for_user(
    p_user_id UUID,
    p_week_date DATE
)
RETURNS TABLE (
    id UUID,
    candidate_user_id UUID,
    similarity_score FLOAT,
    status TEXT,
    shown_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wd.id,
        wd.candidate_user_id,
        wd.similarity_score,
        wd.status,
        wd.shown_at
    FROM weekly_drops wd
    WHERE wd.user_id = p_user_id
      AND wd.week_start_date = p_week_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check candidate eligibility
-- NOTE: This is a placeholder - adjust column names to match your actual schema
-- Your schema may use sender_id/receiver_id OR user_a/user_b OR other column names
CREATE OR REPLACE FUNCTION check_candidate_eligibility(
    p_user_id UUID,
    p_candidate_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_connected BOOLEAN;
    was_previously_shown BOOLEAN;
    is_blocked BOOLEAN;
BEGIN
    -- Check if already connected
    -- TODO: Replace with actual column names from your user_connections table
    SELECT EXISTS (
        SELECT 1 FROM user_connections
        WHERE (sender_id = p_user_id AND receiver_id = p_candidate_id)
           OR (sender_id = p_candidate_id AND receiver_id = p_user_id)
        AND status = 'accepted'
    ) INTO is_connected;
    
    -- Check if previously shown
    SELECT EXISTS (
        SELECT 1 FROM weekly_drops
        WHERE user_id = p_user_id
          AND candidate_user_id = p_candidate_id
    ) INTO was_previously_shown;
    
    -- Check if blocked (if blocked_users table exists)
    -- SELECT EXISTS (...) INTO is_blocked;
    
    RETURN NOT (is_connected OR was_previously_shown);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Acceptance Criteria:**
- [ ] Functions created and tested
- [ ] Functions return correct results
- [ ] Performance is acceptable

---

#### Step 1.3: Edge Function - Monday Drop Selection

**Task:** Create Supabase Edge Function to select Monday Drop candidate

**File:** `supabase/functions/monday-drop-selection/index.ts`

**Functionality:**
1. Takes `user_id` and `week_start_date` as input
2. Checks if drop already exists (return existing if found)
3. Gets candidate pool (all users minus exclusions)
4. Calculates similarity for each candidate
5. Filters by quality threshold (≥75% preferred, ≥70% minimum)
6. Selects best candidate
7. Stores in `weekly_drops` table
8. Returns candidate profile

**Key Logic:**
```typescript
// Pseudocode structure
async function selectMondayDrop(userId: string, weekStartDate: string) {
  // 1. Check if drop already exists (including "no match" results)
  const existing = await getExistingDrop(userId, weekStartDate);
  if (existing) return existing; // Return existing drop or "no match" result
  
  // 2. Get user's DNA
  const userDna = await getUserDNA(userId);
  if (!userDna) throw new Error("User has no DNA");
  
  // 3. Get candidate pool
  const candidates = await getCandidatePool(userId);
  
  // 4. Calculate similarity for each
  const scoredCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const similarity = await calculateSimilarity(userDna, candidate.dna);
      const sharedInterests = countSharedInterests(user.interests, candidate.interests);
      const tier = classifyQualityTier(similarity); // Tier based on similarity only
      return { ...candidate, similarity, sharedInterests, tier };
    })
  );
  
  // 5. Filter by threshold: similarity >= 0.75 AND shared_interests >= 1
  const highQuality = scoredCandidates.filter(
    c => c.similarity >= 0.75 && c.sharedInterests >= 1
  );
  
  // 6. If no high-quality candidates, persist "no match" and return null
  if (highQuality.length === 0) {
    await storeNoMatch(userId, weekStartDate);
    return null;
  }
  
  // 7. Rank by tier, then similarity, then shared interests
  const best = highQuality.sort((a, b) => {
    if (a.tier !== b.tier) return tierOrder[a.tier] - tierOrder[b.tier];
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    return b.sharedInterests - a.sharedInterests;
  })[0];
  
  // 8. Store in database
  await storeDrop(userId, weekStartDate, best);
  
  // 9. Return candidate profile
  return best;
}
```

**Acceptance Criteria:**
- [ ] Edge function deployed
- [ ] Returns correct candidate or null
- [ ] Handles edge cases (no DNA, no candidates, etc.)
- [ ] Performance is acceptable (<5 seconds)

---

### 14.3 Phase 2: Frontend Integration (Week 1, Days 4-5)

#### Step 2.1: Timezone Detection Utility

**Task:** Create utility to detect user timezone and calculate Monday 8am

**File:** `thenetworkwebapp/src/utils/timezone.ts`

**Code:**
```typescript
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC'; // Fallback
  }
}

export function getMonday8AM(weekStartDate: Date, timezone: string): Date {
  // Calculate Monday 8:00 AM in user's timezone
  // Implementation details...
}

export function shouldShowMondayDrop(timezone: string): boolean {
  const now = new Date();
  const monday8am = getMonday8AM(getCurrentWeekMonday(now), timezone);
  return now >= monday8am;
}
```

**Acceptance Criteria:**
- [ ] Timezone detection works
- [ ] Monday 8am calculation is correct
- [ ] Fallback to UTC works

---

#### Step 2.2: Monday Drop Service

**Task:** Create service to fetch Monday Drop from backend

**File:** `thenetworkwebapp/src/services/monday-drop.ts`

**Code:**
```typescript
import { createClient } from '@/utils/supabase/client';

export interface MondayDrop {
  id: string;
  candidate_user_id: string;
  similarity_score: number;
  shared_interests_count: number;
  quality_tier: 'tier_1' | 'tier_2' | 'tier_3';
  status: 'shown' | 'connected' | 'skipped' | 'hidden';
  candidate_profile?: Profile; // Populated separately
}

export async function getMondayDrop(): Promise<MondayDrop | null> {
  const supabase = createClient();
  
  // Get current week's Monday date
  const weekStart = getCurrentWeekMonday(new Date());
  
  // Call edge function
  const { data, error } = await supabase.functions.invoke('monday-drop-selection', {
    body: { 
      week_start_date: weekStart.toISOString().split('T')[0]
    }
  });
  
  if (error) throw error;
  return data;
}

export async function updateMondayDropStatus(
  dropId: string, 
  status: 'connected' | 'skipped' | 'hidden'
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('weekly_drops')
    .update({ 
      status,
      interacted_at: new Date().toISOString()
    })
    .eq('id', dropId);
  
  if (error) throw error;
}
```

**Acceptance Criteria:**
- [ ] Service functions work correctly
- [ ] Error handling is robust
- [ ] Types are correct

---

#### Step 2.3: Integrate into Network Page

**Task:** Add Monday Drop logic to network page

**File:** `thenetworkwebapp/src/app/network/page.tsx`

**Changes Needed:**

1. **Add state for Monday Drop:**
```typescript
const [mondayDrop, setMondayDrop] = useState<MondayDrop | null>(null);
const [shouldShowMondayDrop, setShouldShowMondayDrop] = useState(false);
```

2. **Add useEffect to check and load Monday Drop:**
```typescript
useEffect(() => {
  async function loadMondayDrop() {
    // Check if should show (Monday 8am logic)
    const timezone = getUserTimezone();
    if (!shouldShowMondayDrop(timezone)) return;
    
    // Check if user has completed initial suggestions (Monday Drop only for post-onboarding)
    // Heuristic: connections.length > 4 (or use has_completed_initial_suggestions flag if available)
    if (connections.length <= 4) return;
    
    // Check if user already has a drop for this week (including "no match" results)
    const existing = await getMondayDrop();
    if (existing) {
      // If status is 'no_match', show empty state
      // If status is 'shown', show candidate
      // If status is 'connected'|'skipped'|'hidden', don't show (already interacted)
      if (existing.status !== 'shown' && existing.status !== 'no_match') return;
    }
    
    // Load and show
    setMondayDrop(existing);
    setShouldShowMondayDrop(true);
  }
  
  loadMondayDrop();
}, [connections]);
```

3. **Modify suggestions panel logic:**
```typescript
// Current logic: Show 3 suggestions if connections <= 4
// New logic: 
//   - If connections <= 4: Show 3 suggestions (existing)
//   - If connections > 4 AND Monday Drop exists: Show Monday Drop
//   - Otherwise: Show AriaMessage
```

4. **Add Monday Drop UI (reuse existing suggestion card):**
```typescript
{mondayDrop && shouldShowMondayDrop && (
  <div className={styles.mondayDropContainer}>
    <h2>Your Monday Drop</h2>
    <p>One high-fit person this week.</p>
    <SuggestionCard 
      person={mondayDrop.candidate_profile}
      onConnect={handleMondayDropConnect}
      onSkip={handleMondayDropSkip}
    />
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Monday Drop appears when conditions are met
- [ ] Uses same UI components as 3 suggestions
- [ ] Message disappears when connection is made
- [ ] Doesn't interfere with existing 3 suggestions flow

---

### 14.4 Phase 3: User Interactions (Week 2, Days 1-2)

#### Step 3.1: Connect Action Handler

**Task:** Handle "Connect" button click for Monday Drop

**File:** `thenetworkwebapp/src/app/network/page.tsx`

**Code:**
```typescript
async function handleMondayDropConnect() {
  if (!mondayDrop) return;
  
  // Send friend request (reuse existing logic)
  await sendFriendRequest(mondayDrop.candidate_user_id);
  
  // Update status
  await updateMondayDropStatus(mondayDrop.id, 'connected');
  
  // Hide message (same behavior as 3 suggestions)
  setShouldShowMondayDrop(false);
  setMondayDrop(null);
  
  // Track analytics
  trackEvent('monday_drop_connected', {
    drop_id: mondayDrop.id,
    candidate_id: mondayDrop.candidate_user_id,
    similarity_score: mondayDrop.similarity_score
  });
}
```

**Acceptance Criteria:**
- [ ] Friend request is sent
- [ ] Status is updated in database
- [ ] Message disappears
- [ ] Analytics are tracked

---

#### Step 3.2: Skip Action Handler

**Task:** Handle "Skip" button click for Monday Drop

**File:** `thenetworkwebapp/src/app/network/page.tsx`

**Code:**
```typescript
async function handleMondayDropSkip() {
  if (!mondayDrop) return;
  
  // Update status
  await updateMondayDropStatus(mondayDrop.id, 'skipped');
  
  // Hide message
  setShouldShowMondayDrop(false);
  setMondayDrop(null);
  
  // Track analytics
  trackEvent('monday_drop_skipped', {
    drop_id: mondayDrop.id,
    candidate_id: mondayDrop.candidate_user_id
  });
}
```

**Acceptance Criteria:**
- [ ] Status is updated
- [ ] Message disappears
- [ ] Analytics are tracked
- [ ] Drop doesn't reappear until next Monday

---

#### Step 3.3: Empty State Handling

**Task:** Show "No Monday Drop" message when no high-quality candidate exists

**File:** `thenetworkwebapp/src/app/network/page.tsx`

**Code:**
```typescript
// In loadMondayDrop function:
const drop = await getMondayDrop();
if (drop === null) {
  // No high-quality candidate found
  setShouldShowMondayDrop(true); // Show empty state
  setMondayDrop(null);
}
```

**UI:**
```typescript
{shouldShowMondayDrop && (mondayDrop?.status === 'no_match' || (!mondayDrop && existingDrop?.status === 'no_match')) && (
  <div className={styles.mondayDropEmpty}>
    <h2>Your Monday Drop</h2>
    <p>None this week — we're keeping quality high.</p>
    <p>Check back next Monday.</p>
  </div>
)}
```

**State Logic (Codified):**
- **If Monday Drop exists and status is 'shown'** → Render candidate card, hide rm text
- **If status is 'no_match'** → Render empty state message, hide candidate card
- **If status is 'connected'|'skipped'|'hidden'** → Don't show Monday Drop (already interacted)

**Acceptance Criteria:**
- [ ] Empty state appears when no candidate
- [ ] Message is clear and positive
- [ ] Doesn't confuse users

---

### 14.5 Phase 4: Analytics & Tracking (Week 2, Days 3-4)

#### Step 4.1: Analytics Events

**Task:** Add analytics tracking for all Monday Drop events

**File:** `thenetworkwebapp/src/utils/analytics.ts` (or existing analytics file)

**Events to Track:**
1. `monday_drop_shown` - When drop is displayed
2. `monday_drop_connected` - When user clicks Connect
3. `monday_drop_skipped` - When user clicks Skip
4. `monday_drop_hidden` - When user clicks "Not my type" (if implemented)
5. `monday_drop_no_match` - When no candidate found

**Code:**
```typescript
export function trackMondayDropShown(drop: MondayDrop) {
  trackEvent('monday_drop_shown', {
    drop_id: drop.id,
    week_start_date: drop.week_start_date,
    candidate_id: drop.candidate_user_id,
    similarity_score: drop.similarity_score,
    quality_tier: drop.quality_tier,
    shared_interests_count: drop.shared_interests_count
  });
}
```

**Acceptance Criteria:**
- [ ] All events are tracked
- [ ] Data is sent to analytics platform
- [ ] Events include all relevant metadata

---

#### Step 4.2: Analytics Dashboard

**Task:** Create dashboard to view Monday Drop metrics

**File:** (New admin dashboard or add to existing)

**Metrics to Display:**
- Weekly Drop View → Connect Rate
- Week-over-Week Return Rate
- Skip vs Connect Ratio
- Quality Tier Distribution
- "No Drop" Frequency
- Time to Connect

**Acceptance Criteria:**
- [ ] Dashboard displays all key metrics
- [ ] Data updates in real-time or near real-time
- [ ] Easy to understand and actionable

---

### 14.6 Phase 5: Testing & Refinement (Week 2, Day 5 - Week 3)

#### Step 5.1: Unit Tests

**Task:** Write unit tests for key functions

**Files:**
- `thenetworkwebapp/src/utils/timezone.test.ts`
- `thenetworkwebapp/src/services/monday-drop.test.ts`

**Test Cases:**
- Timezone detection
- Monday 8am calculation
- Candidate eligibility checks
- Similarity calculation
- Quality tier classification

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Edge cases covered

---

#### Step 5.2: Integration Tests

**Task:** Test end-to-end flow

**Test Scenarios:**
1. User opens app on Monday → Sees Monday Drop
2. User clicks Connect → Request sent, message disappears
3. User clicks Skip → Message disappears, doesn't reappear
4. User opens app Tuesday → No Monday Drop (already interacted)
5. User opens app next Monday → Sees new drop
6. No high-quality candidate → Sees empty state
7. User with ≤4 connections → Doesn't see Monday Drop (sees 3 suggestions)

**Acceptance Criteria:**
- [ ] All scenarios work correctly
- [ ] No regressions in existing features
- [ ] Performance is acceptable

---

#### Step 5.3: Performance Optimization

**Task:** Optimize selection algorithm and queries

**Optimizations:**
- Pre-compute drops on Sunday night (background job)
- Cache similarity calculations
- Optimize database queries (add indexes if needed)
- Batch candidate processing

**Acceptance Criteria:**
- [ ] Selection takes <5 seconds
- [ ] No noticeable UI lag
- [ ] Database queries are optimized

---

### 14.7 Phase 6: Deployment (Week 3)

#### Step 6.1: Staging Deployment

**Task:** Deploy to staging environment

**Checklist:**
- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Frontend code deployed
- [ ] Environment variables set
- [ ] RLS policies working
- [ ] Analytics tracking working

---

#### Step 6.2: Beta Testing

**Task:** Test with small group of users

**Process:**
1. Enable feature for 10% of users
2. Monitor metrics closely
3. Gather feedback
4. Fix any issues
5. Gradually increase to 100%

**Acceptance Criteria:**
- [ ] No critical bugs
- [ ] Metrics meet targets
- [ ] User feedback is positive

---

#### Step 6.3: Production Deployment

**Task:** Deploy to production

**Checklist:**
- [ ] All tests passing
- [ ] Staging testing complete
- [ ] Rollback plan ready
- [ ] Monitoring set up
- [ ] Support team briefed

---

### 14.8 Implementation Checklist Summary

**Database:**
- [ ] Create `weekly_drops` table
- [ ] Create indexes
- [ ] Set up RLS policies
- [ ] Create helper functions/RPCs

**Backend:**
- [ ] Create edge function for selection
- [ ] Implement similarity calculation
- [ ] Implement quality tier classification
- [ ] Handle edge cases (no DNA, no candidates)

**Frontend:**
- [ ] Create timezone utility
- [ ] Create Monday Drop service
- [ ] Integrate into network page
- [ ] Add Connect handler
- [ ] Add Skip handler
- [ ] Add empty state
- [ ] Reuse existing UI components

**Analytics:**
- [ ] Track all events
- [ ] Create dashboard
- [ ] Set up alerts

**Testing:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance testing
- [ ] Beta testing

**Deployment:**
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring

---

### 14.9 Risk Mitigation

**Potential Issues & Solutions:**

1. **Issue:** Selection takes too long
   - **Solution:** Pre-compute on Sunday night, cache results

2. **Issue:** Too many "No Drop" weeks
   - **Solution:** Monitor threshold, adjust if needed

3. **Issue:** Timezone detection fails
   - **Solution:** Fallback to UTC, log for debugging

4. **Issue:** Performance issues with large user base
   - **Solution:** Batch processing, optimize queries

5. **Issue:** Conflicts with existing 3 suggestions
   - **Solution:** Clear conditional logic, thorough testing

---

### 14.10 Post-Launch Monitoring

**Metrics to Monitor Daily:**
- Monday Drop view rate
- Connection rate
- Skip rate
- "No Drop" frequency
- Performance metrics (selection time, query time)
- Error rates

**Actions Based on Metrics:**
- If connection rate <30%: Review similarity threshold
- If "No Drop" frequency >50%: Consider lowering threshold
- If performance issues: Optimize queries/algorithm
- If errors: Investigate and fix immediately

---

## 15. Appendix

### 15.1 Example User Flows

#### Flow 1: Happy Path
1. User opens app on Monday
2. Sees "Your Monday Drop" with connection card (same UI as 3 suggestions)
3. Reads compatibility info, shared interests
4. Clicks "Connect"
5. **Message disappears** (same behavior as 3 suggestions - message and connection don't mix)
6. Connection appears in network
7. Next Monday, sees new drop

#### Flow 2: Skip Path
1. User opens app on Monday
2. Sees Monday Drop (same connection card as 3 suggestions)
3. Not interested, clicks "Skip"
4. **Message disappears** (same behavior as 3 suggestions when dismissed)
5. Reopens app later in week - no message shown
6. Next Monday, sees new drop

#### Flow 3: No Match Path
1. User opens app on Monday
2. System finds no high-quality candidates
3. Sees "No Monday Drop this week" message
4. Next Monday, system tries again

### 15.2 Similarity Calculation Pseudocode

```python
def calculate_similarity(user_dna, candidate_dna):
    # Get vectors (prefer v2, fallback to v1)
    user_vector = user_dna.composite_vector or user_dna.interest_vector
    candidate_vector = candidate_dna.composite_vector or candidate_dna.interest_vector
    
    # Cosine similarity
    dot_product = sum(a * b for a, b in zip(user_vector, candidate_vector))
    norm_user = math.sqrt(sum(a * a for a in user_vector))
    norm_candidate = math.sqrt(sum(a * a for a in candidate_vector))
    
    similarity = dot_product / (norm_user * norm_candidate)
    return similarity

def count_shared_interests(user_interests, candidate_interests):
    user_set = set(user_interests)
    candidate_set = set(candidate_interests)
    return len(user_set.intersection(candidate_set))
```

### 15.3 Week Calculation Logic

```python
from datetime import datetime, timedelta
import pytz  # For timezone handling

def get_monday_drop_time(user_timezone='UTC'):
    """
    Calculate when Monday Drop should appear for a user.
    Returns: Monday 8:00 AM in user's local timezone
    """
    # Get user's timezone (fallback to UTC if unavailable)
    try:
        tz = pytz.timezone(user_timezone)
    except:
        tz = pytz.UTC
    
    # Get current time in user's timezone
    now = datetime.now(tz)
    
    # Get Monday of current week
    days_since_monday = now.weekday()  # 0 = Monday, 6 = Sunday
    monday = now - timedelta(days=days_since_monday)
    
    # Set to 8:00 AM on Monday
    monday_8am = monday.replace(hour=8, minute=0, second=0, microsecond=0)
    
    return monday_8am

def should_show_monday_drop(user_timezone='UTC'):
    """
    Check if Monday Drop should be shown now.
    Returns True if current time is after Monday 8:00 AM in user's timezone.
    """
    monday_8am = get_monday_drop_time(user_timezone)
    now = datetime.now(pytz.timezone(user_timezone) if user_timezone != 'UTC' else pytz.UTC)
    
    return now >= monday_8am

# Example:
# User in PST (UTC-8): Monday Drop appears at Monday 8:00 AM PST
# User in EST (UTC-5): Monday Drop appears at Monday 8:00 AM EST
# User in UTC: Monday Drop appears at Monday 8:00 AM UTC
# All users see it in their morning (around 8am local time)
```

**Simplified Approach (if timezone detection is complex):**
- Use browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` to detect user timezone
- If unavailable, fallback to UTC 8:00 AM
- Goal: Everyone sees Monday Drop in their morning (8am local time)

---

## Document Status

**Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** After initial implementation  
**Status:** Ready for Review

---

**End of Specification**

