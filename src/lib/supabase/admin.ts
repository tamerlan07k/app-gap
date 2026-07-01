import { createServerClient } from "@supabase/ssr";
import { env } from "~/env";

// Service-role client — bypasses RLS entirely. Only import in server components
// or server actions. Never expose the result or env.SUPABASE_SERVICE_ROLE_KEY
// to the client bundle.
//
// Uses @supabase/ssr's createServerClient (not the raw @supabase/supabase-js
// createClient) to avoid the RealtimeClient constructor eagerly calling
// WebSocketFactory.getWebSocketConstructor(), which throws on Node.js < 22.
export function createAdminClient() {
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
