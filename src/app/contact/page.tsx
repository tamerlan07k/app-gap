"use client";

import { CheckCircle2, Mail, Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Get in touch
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
          <p className="leading-relaxed text-muted-foreground">
            We&apos;d love to hear your feedback, suggestions, bug reports, or
            partnership inquiries. If you have any questions about AppGap, feel
            free to reach out and we&apos;ll do our best to respond as soon as
            possible.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-5">
          {/* Contact info */}
          <div className="space-y-6 sm:col-span-2">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
                <Mail className="size-4 text-brand-teal" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Email us
                </p>
                <a
                  href="mailto:appgap2009@gmail.com"
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  appgap2009@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
                <Timer className="size-4 text-brand-teal" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Response time
                </p>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 1–3 business days.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="sm:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/10">
                  <CheckCircle2 className="size-6 text-brand-teal" />
                </div>
                <div>
                  <p className="font-semibold">Message sent</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Thanks for reaching out. We&apos;ll review your message and
                    get back to you at the email you provided.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: "", email: "", subject: "", message: "" });
                  }}
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="What's this about?"
                    value={form.subject}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Share your thoughts, questions, or feedback..."
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
