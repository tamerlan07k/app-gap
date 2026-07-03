"use client";

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
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Get in touch
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
          <p className="leading-relaxed text-muted-foreground">
            We'd love to hear your feedback, suggestions, bug reports, or
            partnership inquiries. If you have any questions about AppGap, feel
            free to reach out and we'll do our best to respond as soon as
            possible.
          </p>
        </div>

        <div className="grid gap-12 sm:grid-cols-5">
          <div className="space-y-6 sm:col-span-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Email us directly
              </p>
              <a
                href="mailto:appgap2009@gmail.com"
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                appgap2009@gmail.com
              </a>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Response time
              </p>
              <p className="text-sm text-muted-foreground">
                We typically respond within 1–3 business days.
              </p>
            </div>
          </div>

          <div className="sm:col-span-3">
            {submitted ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted px-6 py-8 text-center">
                <p className="font-semibold">Message sent</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Thanks for reaching out. We'll review your message and get
                  back to you at the email you provided.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: "", email: "", subject: "", message: "" });
                  }}
                  className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
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
                  {loading ? "Sending…" : "Send Email"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
