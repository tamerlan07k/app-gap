"use client";

import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SavedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      setVisible(true);
      // Clean the query param from the URL without a full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 shadow-sm dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-500" />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">Profile saved successfully</p>
        <p className="text-sm text-green-700 dark:text-green-400">
          Your profile has been saved.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="mt-0.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
