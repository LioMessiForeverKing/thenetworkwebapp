import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export interface SchoolLeaderboardEntry {
  school_name: string;
  user_count: number;
  rank: number;
}

/**
 * Mapping of school name variations to canonical names
 * This helps merge duplicate entries like "CUNY Hunter College" and "Hunter College"
 */
const SCHOOL_NAME_NORMALIZATION: Record<string, string> = {
  // Hunter College variations
  'cuny hunter college': 'Hunter College',
  'hunter college': 'Hunter College',
  'cuny hunter': 'Hunter College',
  
  // Columbia variations
  'columbia': 'Columbia University',
  'columbia university': 'Columbia University',
  'columbia uni': 'Columbia University',
  
  // McMaster variations
  'mcmaster': 'McMaster University',
  'mcmaster university': 'McMaster University',
  'mcmaster uni': 'McMaster University',
  
  // Rutgers variations
  'rutgers': 'Rutgers University',
  'rutgers university': 'Rutgers University',
  'rutgers uni': 'Rutgers University',
  'rutgers the state university of new jersey': 'Rutgers University',
  
  // University of Toronto variations
  'university of toronto': 'University of Toronto',
  'u of t': 'University of Toronto',
  'uoft': 'University of Toronto',
  'toronto': 'University of Toronto',
  
  // UC San Diego variations
  'uc san diego': 'UC San Diego',
  'university of california san diego': 'UC San Diego',
  'ucsd': 'UC San Diego',
  'san diego': 'UC San Diego',
  
  // Fordham variations
  'fordham': 'Fordham University',
  'fordham university': 'Fordham University',
  
  // Monash variations
  'monash': 'Monash University',
  'monash university': 'Monash University',
};

/**
 * Normalize school names to handle variations and merge duplicates
 * Converts to lowercase for comparison, then maps to canonical name
 */
function normalizeSchoolName(schoolName: string): string {
  if (!schoolName) return '';
  
  const trimmed = schoolName.trim();
  const lowerKey = trimmed.toLowerCase();
  
  // Remove common prefixes/suffixes for better matching
  const cleaned = lowerKey
    .replace(/^(the|a)\s+/, '') // Remove "The" or "A" prefix
    .replace(/\s+(university|college|uni|u)$/i, '') // Remove trailing "University", "College", etc.
    .replace(/\s+(university|college|uni|u)\s+/i, ' ') // Remove middle "University", "College"
    .trim();
  
  // Check exact match first
  const exactMatch = SCHOOL_NAME_NORMALIZATION[lowerKey];
  if (exactMatch) {
    return exactMatch;
  }
  
  // Check cleaned match
  const cleanedMatch = SCHOOL_NAME_NORMALIZATION[cleaned];
  if (cleanedMatch) {
    return cleanedMatch;
  }
  
  // Try to find a partial match (e.g., "Hunter" matches "Hunter College")
  for (const [key, canonical] of Object.entries(SCHOOL_NAME_NORMALIZATION)) {
    const keyCleaned = key.replace(/\s+(university|college|uni|u)$/i, '').trim();
    
    // Check if the cleaned name matches the key (or vice versa)
    if (cleaned === keyCleaned || lowerKey === key || lowerKey.includes(keyCleaned) || keyCleaned.includes(cleaned)) {
      // Only use if it's a reasonable match (not too short to avoid false positives)
      if (cleaned.length >= 3 && keyCleaned.length >= 3) {
        return canonical;
      }
    }
  }
  
  // Return the original name with proper capitalization
  // Try to capitalize properly (first letter of each word)
  return trimmed.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * GET: Get school leaderboard - shows how many users from each school
 * Counts users by the 'school' text field in profiles
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all profiles with school information
    // Try both 'college' from user_profile_extras, 'school_id' foreign key, and legacy 'school' field
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, school_id, school')
      .or('school_id.not.is.null,school.not.is.null');
    
    // Get user_profile_extras for college information
    const profileIds = profiles?.map(p => p.id) || [];
    const { data: profileExtras } = profileIds.length > 0 ? await supabase
      .from('user_profile_extras')
      .select('user_id, college')
      .in('user_id', profileIds)
      .not('college', 'is', null) : { data: null };
    
    // Create a map of user_id -> college
    const collegeMap = new Map<string, string>();
    if (profileExtras) {
      profileExtras.forEach((extra: any) => {
        if (extra.college) {
          collegeMap.set(extra.user_id, extra.college);
        }
      });
    }

    // If we have school_id references, fetch school details
    const schoolIds = [...new Set((profiles || [])
      .filter((p: any) => p.school_id)
      .map((p: any) => p.school_id))];
    
    let schoolMap = new Map();
    if (schoolIds.length > 0) {
      const { data: schools } = await supabase
        .from('schools')
        .select('id, name, code, location')
        .in('id', schoolIds);
      
      if (schools) {
        schools.forEach((school: any) => {
          schoolMap.set(school.id, school);
        });
      }
    }

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Count users per school
    // Prefer school_id relationship if available, otherwise use school text field
    const schoolCounts = new Map<string, number>();
    
    profiles.forEach((profile: any) => {
      let schoolName: string | null = null;
      
      // Prefer school_id relationship (from schools table)
      if (profile.school_id) {
        const school = schoolMap.get(profile.school_id);
        if (school) {
          schoolName = school.name || null;
        }
      }
      
      // Fall back to college from user_profile_extras
      if (!schoolName) {
        const college = collegeMap.get(profile.id);
        if (college) {
          schoolName = normalizeSchoolName(college);
        }
      }
      
      // Last fallback to legacy school text field
      if (!schoolName && profile.school) {
        schoolName = normalizeSchoolName(profile.school);
      }
      
      if (schoolName) {
        schoolCounts.set(schoolName, (schoolCounts.get(schoolName) || 0) + 1);
      }
    });

    if (schoolCounts.size === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Convert to array and sort by user count
    const entries: SchoolLeaderboardEntry[] = Array.from(schoolCounts.entries())
      .map(([school_name, user_count]) => ({
        school_name,
        user_count,
        rank: 0 // Will be set after sorting
      }))
      .sort((a, b) => {
        // Sort by count first, then alphabetically
        if (b.user_count !== a.user_count) {
          return b.user_count - a.user_count;
        }
        return a.school_name.localeCompare(b.school_name);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return NextResponse.json({ leaderboard: entries });
  } catch (error: any) {
    console.error('Error in GET /api/school-leaderboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
