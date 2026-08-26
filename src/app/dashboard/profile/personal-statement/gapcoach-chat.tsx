"use client";

import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GapCoachAvatar } from "~/components/gapcoach-avatar";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type { ChatMessage } from "~/lib/personal-statement/chat";

export function GapCoachChat({
  statementId,
  messages,
  onMessagesChange,
}: {
  statementId: string;
  messages: ChatMessage[];
  onMessagesChange: (next: ChatMessage[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages / loading
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    // Optimistic: show the student's message immediately.
    const optimistic: ChatMessage = {
      role: "user",
      content: text,
      at: new Date().toISOString(),
    };
    onMessagesChange([...messages, optimistic]);
    setInput("");
    try {
      const res = await fetch("/api/personal-statement/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "GapCoach couldn't reply.");
        // Roll back the optimistic message on failure.
        onMessagesChange(messages);
        return;
      }
      onMessagesChange(data.messages as ChatMessage[]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch {
      setError("Something went wrong. Please try again.");
      onMessagesChange(messages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating toggle */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
          size="lg"
        >
          <MessageCircle />
          Ask GapCoach
        </Button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card shadow-xl sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-4 py-3">
            <div className="flex items-center gap-2">
              <GapCoachAvatar className="size-7" />
              <div>
                <p className="text-sm font-semibold">GapCoach</p>
                <p className="text-[11px] text-muted-foreground">
                  Your writing coach
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              title="Close chat"
            >
              <X />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="flex items-start gap-2">
                <GapCoachAvatar className="size-6" />
                <div className="rounded-2xl rounded-tl-sm border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                  Hi! I'm GapCoach. Ask me anything while you write — like "is
                  my opening too slow?" or "does this paragraph show real
                  reflection?" I'll point you in a direction, but I won't write
                  it for you.
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: chat is append-only positional
                  key={i}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: chat is append-only positional
                  key={i}
                  className="flex items-start gap-2"
                >
                  <GapCoachAvatar className="size-6" />
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                    {m.content}
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GapCoachAvatar className="size-6" />
                <Loader2 className="size-3.5 animate-spin" />
                GapCoach is thinking…
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask GapCoach…"
                rows={2}
                maxLength={2000}
                className="min-h-0 resize-none"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={loading || !input.trim()}
                title="Send"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
            {remaining !== null && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {remaining} message{remaining === 1 ? "" : "s"} left this month
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
