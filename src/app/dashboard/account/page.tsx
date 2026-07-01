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
      <h1 className="text-2xl font-bold">Account</h1>

      <dl className="max-w-sm divide-y divide-border">
        {fields.map(({ label, value }) => (
          <div key={label} className="py-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 text-sm">{value}</dd>
          </div>
        ))}
      </dl>

      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
