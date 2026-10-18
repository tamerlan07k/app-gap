"use client";

import {
  ChevronDown,
  CreditCard,
  LogOut,
  MessageSquare,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { cn } from "~/lib/utils";

type UserMenuProps = {
  firstName: string | null;
  isAdmin?: boolean;
  signOutAction: () => void | Promise<void>;
};

const itemClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-muted focus-visible:bg-muted";

export function UserMenu({ firstName, isAdmin, signOutAction }: UserMenuProps) {
  const initial = (firstName?.trim()?.[0] ?? "A").toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border/70 bg-background py-1 pl-1 pr-3 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-brand-teal text-xs font-bold text-primary-foreground">
            {initial}
          </span>
          <span className="hidden sm:inline">{firstName ?? "Account"}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 min-w-52 rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-lg",
            "data-[state=open]:animate-fade-in",
          )}
        >
          {firstName && (
            <>
              <p className="px-3 py-1.5 text-xs text-muted-foreground">
                Signed in as{" "}
                <span className="font-semibold text-foreground">
                  {firstName}
                </span>
              </p>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
            </>
          )}

          <DropdownMenu.Item asChild>
            <Link href="/dashboard/account" className={itemClass}>
              <User className="size-4 text-muted-foreground" />
              My Account
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/dashboard/billing" className={itemClass}>
              <CreditCard className="size-4 text-muted-foreground" />
              Billing
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/dashboard/feedback" className={itemClass}>
              <MessageSquare className="size-4 text-muted-foreground" />
              Feedback
            </Link>
          </DropdownMenu.Item>

          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link href="/admin" className={itemClass}>
                <Shield className="size-4 text-muted-foreground" />
                Admin
              </Link>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <form action={signOutAction}>
            <DropdownMenu.Item asChild>
              <button
                type="submit"
                className={cn(itemClass, "text-destructive")}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
