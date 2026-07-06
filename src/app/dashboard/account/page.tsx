import { redirect } from "next/navigation";
import { signOut } from "~/app/auth/actions";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { getFirstName, getLastName } from "~/lib/user";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const firstName = getFirstName(user);
  const lastName = getLastName(user);

  const fields = [
    { label: "First name", value: firstName },
    { label: "Last name", value: lastName || "—" },
    { label: "Email", value: user.email ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Profile
          </p>
        </div>
        <dl className="divide-y divide-border px-6">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-6 py-4">
              <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold">Sign out</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          You&apos;ll be redirected to the home page.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
