import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client using service_role key.
 * Bypasses RLS — use only in Server Actions for write operations
 * where the user has already been authenticated via getUser().
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
