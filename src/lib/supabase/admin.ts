import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Service-role client — bypasses RLS entirely. Only import in server components
// or server actions. Never expose the result or env.SUPABASE_SERVICE_ROLE_KEY
// to the client bundle.
export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
