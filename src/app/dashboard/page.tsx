import Link from "next/link";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { createClient } from "~/lib/supabase/server";
import { getFirstName } from "~/lib/user";
import { SavedBanner } from "./saved-banner";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user ? getFirstName(user) : "there";

  return (
    <div className="space-y-8">
      <Suspense>
        <SavedBanner />
      </Suspense>

      <div>
        <h1 className="text-3xl font-bold">Hi, {firstName}.</h1>
        <p className="mt-1 text-muted-foreground">
          Ready to strengthen your college application?
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Build My Roadmap</CardTitle>
          <CardDescription>
            AppGap will analyze your academic profile, extracurriculars, and
            career direction to generate a personalized set of recommendations —
            so you know exactly where to focus before you apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" asChild>
            <Link href="/profile">Start My Roadmap</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
