import Link from "next/link";
import { Button } from "~/components/ui/button";

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          AppGap
        </Link>
        <Button variant="outline" size="sm" asChild>
          <Link href="/profile">Try AppGap</Link>
        </Button>
      </div>
    </nav>
  );
}
