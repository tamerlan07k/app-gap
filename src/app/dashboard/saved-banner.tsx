"use client";

import { CheckCircle2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface BannerMessage {
  title: string;
  body: string;
}

export function SavedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<BannerMessage | null>(null);

  useEffect(() => {
    const saved = searchParams.get("saved");
    const analyzed = searchParams.get("analyzed");

    if (analyzed === "1") {
      setMessage({
        title: "Analysis complete!",
        body: "Your personalized admissions gap analysis is ready. Scroll down to explore your results.",
      });
      setVisible(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("analyzed");
      router.replace(url.pathname, { scroll: false });
    } else if (saved === "1") {
      setMessage({
        title: "Profile saved",
        body: "Your profile has been saved. Complete the review step to generate your AI analysis.",
      });
      setVisible(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router]);

  if (!visible || !message) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 shadow-sm dark:border-green-800 dark:bg-green-950/40 dark:text-green-100">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-500" />
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium">{message.title}</p>
        <p className="text-sm text-green-700 dark:text-green-400">
          {message.body}
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
