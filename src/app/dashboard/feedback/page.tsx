"use client";

import { Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

export default function FeedbackPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in to submit feedback.");
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: user.email,
      subject: subject.trim(),
      message: message.trim(),
    });

    if (insertError) {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setSubmitted(true);
    setIsSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
          <p className="mt-1 text-muted-foreground">
            Share your thoughts, bugs, or feature ideas.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <MessageSquare className="mx-auto mb-3 size-7 text-muted-foreground" />
          <p className="font-medium">Thanks for your feedback!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We read every submission and use it to improve AppGap.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              setSubject("");
              setMessage("");
              setSubmitted(false);
            }}
          >
            Submit another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
        <p className="mt-1 text-muted-foreground">
          Share your thoughts, bugs, or feature ideas.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            type="text"
            placeholder="e.g. Feature request, Bug report"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">
            Message{" "}
            <span className="text-xs font-normal text-muted-foreground">
              required
            </span>
          </Label>
          <textarea
            id="message"
            rows={5}
            placeholder="Tell us what's on your mind…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isSubmitting || !message.trim()}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Send feedback
        </Button>
      </form>
    </div>
  );
}
