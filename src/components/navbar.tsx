import Link from "next/link";
import { signOut } from "~/app/auth/actions";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { getFirstName } from "~/lib/user";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user ? getFirstName(user) : null;

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          AppGap
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                Hi, {firstName}
              </span>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
