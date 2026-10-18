import Link from "next/link";
import { signInWithGoogle, signUp } from "~/app/auth/actions";
import { AuthShell } from "~/components/auth/auth-shell";
import { GoogleIcon } from "~/components/auth/google-icon";
import { PasswordInput } from "~/components/auth/password-input";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      tagline={
        <>
          Start closing
          <br /> the <span className="text-brand-teal">gap.</span>
        </>
      }
      subline="See where your profile stands and exactly what to work on next."
    >
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Save your profile and track your application gap analysis.
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
            or sign up with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={signUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="Alex"
                className="h-11 rounded-full px-4"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last name{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="last_name"
                name="last_name"
                placeholder="Kim"
                className="h-11 rounded-full px-4"
              />
            </div>
          </div>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="h-11 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-brand-teal underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
