import { createClient } from "~/lib/supabase/server";

// Marks the caller's subscription notifications as read. RLS restricts updates
// to the user's own rows, so this only ever affects the authenticated user.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // No/invalid body — fall through to marking all unread as read.
  }

  const now = new Date().toISOString();
  let query = supabase
    .from("subscription_notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error) {
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }

  return Response.json({ success: true });
}
