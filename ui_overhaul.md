# New User Journey Timeline & Codebase Mapping

This document outlines the current flow for a new user visiting the application, including the order of pages and their corresponding codebase locations.

## 1. Initial Visit (Home Redirect)
*   **URL:** `/`
*   **Codebase:** `src/app/page.tsx`
*   **Behavior:**
    *   Checks authentication state.
    *   If not logged in, automatically redirects to `/landing`.
    *   If logged in, displays the main application (Network Graph).

## 2. Landing Page
*   **URL:** `/landing`
*   **Codebase:** `src/app/landing/page.tsx`
*   **Behavior:**
    *   Displays value proposition (Logo, Tagline, Trust Badges).
    *   **Primary Action:** "Claim my Digital DNA" button redirects to `/onboarding`.

## 3. Onboarding (Value Prop & Sign In)
*   **URL:** `/onboarding`
*   **Codebase:** `src/app/onboarding/page.tsx`
*   **Behavior:**
    *   Displays cards explaining the "why" (Social media is draining, etc.).
    *   **Action:** "Continue with Google" triggers Supabase OAuth sign-in.
    *   **Context:** `src/contexts/AuthContext.tsx` handles the `signInWithGoogle` function.

## 4. Authentication Callback
*   **URL:** `/auth/callback`
*   **Codebase:** `src/app/auth/callback/page.tsx`
*   **Behavior:**
    *   Handles the OAuth redirect from Google.
    *   Checks if the user is new or has an incomplete profile (checks `profiles` table).
    *   **Logic:**
        *   If `!profile` or `profile.age === null` -> Redirects to `/profile-setup` (New User Flow).
        *   If profile exists and is complete -> Redirects to `/` (Home).

## 5. Profile Setup - Step 1: Basic Info
*   **URL:** `/profile-setup`
*   **Codebase:** `src/app/profile-setup/page.tsx`
*   **Behavior:**
    *   Collects basic user information:
        *   Photo (upload or Google default)
        *   Name
        *   Age (13-120)
        *   Location
        *   One-liner
    *   **Action:** "Continue" saves data to `profiles` table and redirects to `/profile-setup/signals`.

## 6. Profile Setup - Step 2: Signals
*   **URL:** `/profile-setup/signals`
*   **Codebase:** `src/app/profile-setup/signals/page.tsx`
*   **Behavior:**
    *   Allows user to connect external platforms (YouTube, TikTok, etc.).
    *   Checks if YouTube is already connected via Google Auth.
    *   **Action:** "Continue" or "Skip" redirects to `/profile-setup/building`.

## 7. Profile Setup - Step 3: Building (Processing)
*   **URL:** `/profile-setup/building`
*   **Codebase:** `src/app/profile-setup/building/page.tsx`
*   **Behavior:**
    *   Displays a "Building your Digital DNA" animation.
    *   **Background Process:**
        1.  Syncs YouTube data (`YouTubeService.syncYouTubeData`).
        2.  Derives interests via Edge Function (`YouTubeService.deriveInterests`).
    *   **Action:** Automatically redirects to `/profile-setup/wrapped` upon completion or timeout.
    *   **Service:** `src/services/youtube.ts` contains the logic for syncing and deriving interests.

## 8. Profile Setup - Step 4: Wrapped (Presentation)
*   **URL:** `/profile-setup/wrapped`
*   **Codebase:** `src/app/profile-setup/wrapped/page.tsx`
*   **Behavior:**
    *   Displays a multi-slide, "Spotify Wrapped" style presentation of the user's derived data (Interests, Archetypes, etc.).
    *   **Action:** Final slide has "Enter Your Network" button which redirects to `/`.

## 9. Main Application (Home)
*   **URL:** `/`
*   **Codebase:** `src/app/page.tsx`
*   **Behavior:**
    *   User is now fully authenticated and onboarded.
    *   Displays the interactive Network Graph with the user at the center.
    *   Loads connections and friend requests.

---

# New Design Specs (UnboardingUI)

The `UnboardingUI` folder contains the target design assets and React components exported from Figma. These components should serve as the visual reference and source for assets (SVGs, images) for the UI overhaul.

### Component Mapping

| Current Route | New Component Source | Description |
| :--- | :--- | :--- |
| **Landing** (`/landing`) | `UnboardingUI/src/imports/LandingPageUnauthenticated.tsx` | Updated landing page with specific gradients and assets. |
| **Onboarding** (`/onboarding`) | `UnboardingUI/src/imports/Group4.tsx` (exported as `HowItWorksInterstitial`) | The "Social media is draining" card interface. |
| **Profile Setup** (`/profile-setup`) | `UnboardingUI/src/imports/SetupWizardStepBasedProgressBar.tsx` | Basic Info form with "25%" progress bar and specific styling for inputs. |
| **Signals** (`/profile-setup/signals`) | `UnboardingUI/src/imports/ConnectAccountsMainConversionStep.tsx` | "Add signals" page with "50%" progress bar and platform logos (LinkedIn, YouTube, etc.). |
| **Building** (`/profile-setup/building`) | `UnboardingUI/src/imports/BuildingYourDnaShortAnimation.tsx` | "Building your Digital DNA" page with "100%" progress bar and animation placeholder. |
| **Wrapped** (`/profile-setup/wrapped`) | `UnboardingUI/src/imports/DigitalDnaRevealPayoffMoment*.tsx` | A sequence of components (frames) representing the new "Wrapped" animation flow. |

### Implementation Notes

1.  **Asset Migration:** The `UnboardingUI/src/assets` folder contains all necessary images. These should be moved to `public/` or `src/assets` in the main project.
2.  **Styling:** The new designs use Tailwind CSS (inferred from class names like `absolute left-[458px]`). The current project uses CSS Modules (`.module.css`). We will need to either:
    *   Adapt the Tailwind classes to standard CSS in module files.
    *   OR install Tailwind and use the components more directly (recommended if feasible, but requires config changes).
    *   *Decision:* Since we are "making no backend changes" and this is a UI overhaul, we should stick to the existing CSS Modules approach to maintain consistency unless a full Tailwind migration is desired. We will translate the specific pixel values and positioning from the Figma exports into responsive CSS where possible, or keep the strict positioning if the design demands it.
3.  **Wrapped Animation:** The "Wrapped" section in `UnboardingUI` is split across many files (`DigitalDnaRevealPayoffMoment-5-365.tsx`, etc.), indicating a frame-by-frame or state-based animation. We will need to implement this using a unified component with state transitions (similar to the current `wrapped/page.tsx` slide logic) rather than importing 20 separate components.
