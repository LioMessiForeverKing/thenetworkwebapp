# Network Proximity System Design

## Overview

This document outlines the design for a proximity-based system that determines how users are **placed in space** on the network graph. The system moves beyond pure interest-based matching to incorporate real-world social connections and network overlap.

**Key Principle**: We are not ranking people. We are placing them in space. Networks determine whether someone exists in your world. Network strength determines how close they are.

## Core Philosophy

### The Three Questions

1. **Can we meet?** (Social Proximity Gate)
   - Binary filter: Do we share at least one network?
   - If no → not visible. Don't render them.

2. **How likely are we to meet?** (Network + Mutual Overlap)
   - Network overlap with weighted strength
   - Mutual connections (normalized)
   - This determines **distance** in the graph

3. **Why would we get along?** (Interest Overlap)
   - Embeddings/DNA v2 compatibility
   - This is **texture**, not authority
   - Used for explanation overlays, weighted low (~15%)

### What This Is NOT

- ❌ A feed that ranks people
- ❌ A recommendation engine showing "top matches"
- ❌ A system that hides people based on algorithm scores

### What This IS

- ✅ A spatial system that places people based on proximity
- ✅ A visibility system with clear thresholds (shared network = visible)
- ✅ A distance engine where closer = more overlap

---

## Stage 1: Social Proximity Gate (Binary Filter)

### Rule

```
IF shared_networks == 0:
    DO NOT RENDER this person
ELSE:
    PROCEED to overlap calculation
```

### Why

If you don't share any networks with someone (you're in NYC, they're in Cambodia), there's no realistic chance of meeting in real life. It doesn't matter if you have 90% interest compatibility—you will never meet.

**No penalties. No soft reductions. Just don't render them.**

This keeps the graph honest and prevents clutter.

### Examples of Networks

- Companies: Google, The Network, The Company
- Cities: New York City, San Francisco
- Schools: Hunter College, Columbia, Portlishment
- Communities: The Network community, YC alumni

---

## Stage 2: Overlap Signal Calculation

All components are **normalized to [0, 1]**. This is critical for:
- Distance engines (bounded inputs)
- Tuning and debugging
- Stable UI/graph rendering

### Component A: Network Overlap Score

**This replaces both "network overlap count" and "network strength" from the old design.**

#### Base Weights by Network Type

| Network Type | Base Weight | Reasoning |
|--------------|-------------|-----------|
| High school / small cohort | 0.9 | Very intimate, you likely know most people |
| College / University | 0.8 | Strong shared experience, meaningful bonds |
| Company | 0.7 | Professional context, regular interaction potential |
| City | 0.4 | Broad, many people, weak signal |
| Interest-only community | 0.25 | Weak tie, no guarantee of meeting |

#### The Formula (with Saturation)

```
NetworkScore = 1 − exp(−Σ w(n))
```

Where `w(n)` is the base weight of each shared network.

#### Why Saturation?

**Without saturation (linear stacking):**
- 4 Tier D networks = 8 points
- 1 Tier A network = 16 points
- This is absurd—one high school connection ≠ 16 city-level connections

**With saturation (diminishing returns):**
- 1 strong network → big effect (~0.6)
- 2 strong networks → bigger effect (~0.8)
- 3+ networks → diminishing returns (approaches 1.0 asymptotically)

This models real human perception: **the first shared network matters most**.

#### Example Calculations

**Example 1: Strong overlap**
- Shared: High school (0.9) + College (0.8)
- NetworkScore = 1 − exp(−(0.9 + 0.8)) = 1 − exp(−1.7) = 1 − 0.18 = **0.82**

**Example 2: Weak overlap**
- Shared: City only (0.4)
- NetworkScore = 1 − exp(−0.4) = 1 − 0.67 = **0.33**

**Example 3: Multiple weak networks**
- Shared: City (0.4) + Community (0.25) + Community (0.25)
- NetworkScore = 1 − exp(−0.9) = 1 − 0.41 = **0.59**
- Note: 3 weak networks < 1 strong network (0.59 < 0.82)

### Component B: Mutual Overlap Score

**Definition**: Number of friends you both know, normalized by degree (connection count).

#### The Formula (Standard Graph Math)

```
MutualScore = m / sqrt(deg(u) × deg(v))
```

Where:
- `m` = count of mutual friends
- `deg(u)` = your connection count
- `deg(v)` = their connection count

**Clamp result to [0, 1].**

#### Why This Formula?

This is the **standard degree-normalized mutual friends** formula used in graph theory. It:

1. **Penalizes social butterflies**: If you have 500 friends and they have 500 friends, 10 mutuals is less impressive than if you both have 20 friends.

2. **Rewards rare mutuals**: If you both have few connections and still share friends, that's meaningful.

3. **Is stable and interpretable**: No percentile lookups, no conditional logic.

#### Example Calculations

**Example 1: Both well-connected**
- You: 100 connections
- Them: 100 connections
- Mutual friends: 5
- MutualScore = 5 / sqrt(100 × 100) = 5 / 100 = **0.05**

**Example 2: Both modestly connected**
- You: 25 connections
- Them: 25 connections
- Mutual friends: 5
- MutualScore = 5 / sqrt(25 × 25) = 5 / 25 = **0.20**

**Example 3: Rare but meaningful**
- You: 10 connections
- Them: 10 connections
- Mutual friends: 3
- MutualScore = 3 / sqrt(10 × 10) = 3 / 10 = **0.30**

### Component C: Interest Overlap Score

**Keep existing DNA v2 cosine similarity**, but weight it low.

```
InterestScore = cosine_similarity(your_dna_v2, their_dna_v2)
```

Range: [0, 1] (typically 0.3 to 0.9)

#### Why Low Weight?

Interest overlap explains **why you should meet**, not **whether you can meet**.

- Networks: "You both work at Google, you both went to Hunter"
- Interests: "You both like startups, philosophy, and electronic music"

Interests add **texture** to the connection. They don't determine proximity.

**Use interests for:**
- Explanation overlays ("You both share interest in X")
- Profile matching reasons
- Conversation starters

**Don't use interests for:**
- Primary distance calculation
- Visibility thresholds
- Ranking

---

## Stage 3: Final Overlap Signal

### The Formula

```
Overlap = (0.55 × NetworkScore) + (0.30 × MutualScore) + (0.15 × InterestScore)
```

Where:
- **NetworkScore** ∈ [0, 1] — weighted network overlap with saturation
- **MutualScore** ∈ [0, 1] — degree-normalized mutual friends
- **InterestScore** ∈ [0, 1] — cosine similarity of DNA v2

**Result**: Overlap ∈ [0, 1]

### Weight Rationale

| Component | Weight | Why |
|-----------|--------|-----|
| NetworkScore | 55% | Primary signal. Networks determine if you can meet. |
| MutualScore | 30% | Strong reinforcement. Mutual friends = real social bridge. |
| InterestScore | 15% | Texture only. Explains why, doesn't determine whether. |

### Distance Mapping

Higher Overlap → Closer in graph.

```
distance = min_distance + (max_distance − min_distance) × (1 − Overlap)^p
```

Where:
- `min_distance` = minimum node spacing (e.g., 50px)
- `max_distance` = maximum node spacing (e.g., 400px)
- `p` = curvature parameter (e.g., 1.5 for non-linear spacing)

---

## Complete Example

### Scenario

**You**: Portlishment High School, Hunter College, Google, NYC
**Person A**: Portlishment High School, Hunter College, Google

### Step 1: Social Proximity Gate

- Shared networks: 3 (Portlishment, Hunter, Google)
- ✅ PASS (at least one shared network)

### Step 2: Calculate NetworkScore

Shared network weights:
- Portlishment (high school): 0.9
- Hunter College: 0.8
- Google (company): 0.7
- Total: 2.4

```
NetworkScore = 1 − exp(−2.4) = 1 − 0.09 = 0.91
```

### Step 3: Calculate MutualScore

- Your connections: 50
- Their connections: 30
- Mutual friends: 8

```
MutualScore = 8 / sqrt(50 × 30) = 8 / 38.7 = 0.21
```

### Step 4: Calculate InterestScore

```
InterestScore = 0.78 (from DNA v2 cosine similarity)
```

### Step 5: Final Overlap

```
Overlap = (0.55 × 0.91) + (0.30 × 0.21) + (0.15 × 0.78)
        = 0.50 + 0.06 + 0.12
        = 0.68
```

### Result

- **Overlap**: 0.68 (high)
- **Distance**: Close in the graph
- **Display**: Prominent, nearby node with shared network badges

---

## Comparison: Before vs. After

### Before (Flawed Design)

```
CETA = (0.4 × 3) + (0.3 × 3.0) + (0.3 × 28) = 10.5  ← Unbounded!
Final = (0.6 × 10.5) + (0.4 × 0.82) = 6.6  ← Mixed scales!
```

**Problems:**
- Double-counting network overlap and strength
- Unbounded CETA (10.5 means nothing)
- Mixed scales (6.6 vs 0.82)
- Aggressive tier multipliers (16x, 8x...)
- Ranking mindset ("top 50 matches")

### After (Corrected Design)

```
NetworkScore = 1 − exp(−2.4) = 0.91  ← Bounded [0,1]!
MutualScore = 8 / sqrt(1500) = 0.21  ← Bounded [0,1]!
InterestScore = 0.78  ← Already [0,1]
Overlap = 0.68  ← Bounded [0,1]!
```

**Fixes:**
- Single NetworkScore (no double-counting)
- All components [0, 1]
- Saturation for diminishing returns
- Standard mutual normalization
- Proximity mindset (distance, not ranking)

---

## Network Tier Classification

### Type-Based Classification (v1)

| Network Type | Base Weight | Tier Equivalent |
|--------------|-------------|-----------------|
| High school | 0.9 | Tier A |
| College/University | 0.8 | Tier B |
| Company | 0.7 | Tier B |
| City | 0.4 | Tier C |
| Community | 0.25 | Tier D |

### Future: LLM-Based Classification

For networks that don't fit neatly into categories, use an LLM to reason about:
- Size (how many people?)
- Intimacy (how well do members know each other?)
- Interaction frequency (how often do members meet?)

**Note**: This doesn't have to be perfect. It has to be workable.

---

## Data Architecture

### Current State

**Existing fields in `user_profile_extras`:**
- `networks` (TEXT[] array, max 4)
- `college` (TEXT)
- `high_school` (TEXT)
- `company` (TEXT)

### Required for v1

1. **Network type classification** — Map each network to a type (high_school, college, company, city, community)

2. **Connection count per user** — For mutual normalization (`deg(u)`)

3. **Mutual friend lookup** — Query to find shared connections

### Optional for v2

1. **Network verification status** — Verified networks get full weight (1.0x), unverified get reduced (0.6x)

2. **Network recency** — Current networks get full weight, past networks reduced (0.8x)

3. **Network specificity** — "Google NYC Office" more specific than "Google" (1.0x vs 0.7x)

---

## Implementation Notes

### For Engineers

**Core principles:**
1. We are not ranking people. We are placing them in space.
2. Networks determine whether someone exists in your world.
3. Network strength determines how close they are.
4. Mutuals reinforce closeness.
5. Interests add texture, not authority.

**Calculations:**
1. All inputs must be [0, 1]
2. All outputs must be [0, 1]
3. Use saturation formula: `1 − exp(−Σw)`
4. Use standard mutual formula: `m / sqrt(deg(u) × deg(v))`

**Rendering:**
1. Social Proximity Gate is binary (visible or not)
2. Overlap → distance (higher overlap = closer)
3. No sorting/ranking of nodes
4. Show badges for shared networks

### Pseudocode

```typescript
function calculateOverlap(userA: User, userB: User): number {
  // Stage 1: Social Proximity Gate
  const sharedNetworks = getSharedNetworks(userA, userB);
  if (sharedNetworks.length === 0) {
    return -1; // Signal: do not render
  }

  // Stage 2a: Network Score (with saturation)
  const networkWeightSum = sharedNetworks.reduce((sum, network) => {
    return sum + getNetworkWeight(network);
  }, 0);
  const networkScore = 1 - Math.exp(-networkWeightSum);

  // Stage 2b: Mutual Score (degree-normalized)
  const mutualCount = getMutualFriends(userA, userB).length;
  const degreeProduct = userA.connectionCount * userB.connectionCount;
  const mutualScore = Math.min(1, mutualCount / Math.sqrt(degreeProduct));

  // Stage 2c: Interest Score
  const interestScore = cosineSimilarity(userA.dnaV2, userB.dnaV2);

  // Stage 3: Final Overlap
  const overlap = (0.55 * networkScore) + (0.30 * mutualScore) + (0.15 * interestScore);
  
  return overlap;
}

function getNetworkWeight(network: Network): number {
  switch (network.type) {
    case 'high_school': return 0.9;
    case 'college': return 0.8;
    case 'company': return 0.7;
    case 'city': return 0.4;
    case 'community': return 0.25;
    default: return 0.25;
  }
}
```

---

## Summary

### The Equation (v1)

```
// Gate
IF shared_networks == 0: DO NOT RENDER

// Overlap
NetworkScore = 1 − exp(−Σ w(n))           // w(n) = base weight per network
MutualScore = m / sqrt(deg(u) × deg(v))   // clamped to [0,1]
InterestScore = cosine_similarity(dna_u, dna_v)

Overlap = 0.55 × NetworkScore + 0.30 × MutualScore + 0.15 × InterestScore
```

### Key Properties

| Property | Value |
|----------|-------|
| All inputs | [0, 1] |
| All outputs | [0, 1] |
| Primary signal | Network overlap (55%) |
| Secondary signal | Mutual friends (30%) |
| Tertiary signal | Interests (15%) |
| Saturation | Yes (diminishing returns) |
| Ranking | No (proximity-based placement) |

---

## Open Questions (v2)

1. **Network verification** — Should verified networks get higher weight?
2. **Network recency** — Should past networks count less?
3. **Network specificity** — "Google NYC" vs "Google"?
4. **City distance decay** — Should NYC and SF have some proximity?
5. **Temporal networks** — How to handle someone who left a company?

---

## Changelog

- **v1.1** — Corrected double-counting of network overlap/strength. Added saturation formula. Normalized all components to [0,1]. Simplified mutual normalization to standard graph formula. Reframed from ranking to proximity.
- **v1.0** — Initial design with CETA point system.
