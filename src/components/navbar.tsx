import Link from "next/link";
import { signOut } from "~/app/auth/actions";
import { AppGapLogo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { UserMenu } from "~/components/user-menu";
import { isAdmin } from "~/lib/is-admin";
import { createClient } from "~/lib/supabase/server";
import { getFirstName } from "~/lib/user";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user ? getFirstName(user) : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <AppGapLogo className="h-7 w-auto" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            AppGap
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <UserMenu
              firstName={firstName}
              isAdmin={isAdmin(user.email)}
              signOutAction={signOut}
            />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
