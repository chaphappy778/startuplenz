// apps/web/types/supabase.ts
//
// Placeholder Database typing for @supabase/ssr's generic. Replace by running:
//
//   npx supabase gen types typescript --linked > apps/web/types/supabase.ts
//
// Until then, callers get permissive `any` shapes for table rows, which is
// fine for the current codebase (queries use string selects and runtime
// validation).

export type Database = unknown;

// Anything else the rest of the app imports from here:
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
