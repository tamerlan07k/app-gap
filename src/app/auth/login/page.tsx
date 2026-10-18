import Link from "next/link";
import { signIn, signInWithGoogle } from "~/app/auth/actions";
import { AuthShell } from "~/components/auth/auth-shell";
import { GoogleIcon } from "~/components/auth/google-icon";
import { PasswordInput } from "~/components/auth/password-input";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      tagline={
        <>
          Know where
          <br /> you <span className="text-brand-teal">stand.</span>
        </>
      }
      subline="Pick up your profile and keep closing the gap before you apply."
    >
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to pick up where you left off.
        </p>

        <form action={signInWithGoogle} className="mt-8">
          <Button type="submit" variant="outline" className="h-11 w-full gap-2">
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            or sign in with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={signIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="h-11 rounded-full px-4"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" name="password" required />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              You do not have an account yet, please{" "}
              <Link
                href="/auth/signup"
                className="font-medium underline underline-offset-4"
              >
                sign up
              </Link>
              .
            </p>
          )}

          <Button type="submit" size="lg" className="h-11 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-brand-teal underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
