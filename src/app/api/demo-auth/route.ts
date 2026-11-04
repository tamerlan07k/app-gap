// TEMPORARY dev-only helper for recording a demo video. Writes a Playwright
// storageState file (session cookies) to disk so a headless recorder can reuse
// the signed-in session. The token stays on this machine. DELETE after use.
import { writeFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

const OUT =
  "C:/Users/tamer/AppData/Local/Temp/claude/C--Users-tamer-Downloads-Code-app-gap/20597ee2-c2ae-438a-834a-d3ac0184e958/scratchpad/auth.json";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "not-signed-in" },
      { status: 401 },
    );
  }
  const raw = request.headers.get("cookie") ?? "";
  const pairs = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("=");
      return { name: s.slice(0, i), value: s.slice(i + 1) };
    })
    .filter((p) => p.name.startsWith("sb-"));
  const storageState = {
    cookies: pairs.map((p) => ({
      name: p.name,
      value: p.value,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
    origins: [],
  };
  writeFileSync(OUT, JSON.stringify(storageState));
  return NextResponse.json({ ok: true, count: pairs.length });
}
