"use client";

import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "~/components/formatted-message";
import { Button } from "~/components/ui/button";
import { type ChatMessage, MAX_CHAT_MESSAGE } from "~/lib/supplemental/chat";
import { cn } from "~/lib/utils";

// Floating GapCoach chat for a supplemental essay. Sends { essayId, message } to
// the chat route, which reads the draft + prompt + verified college info
// server-side. Optimistic user message with rollback on error.
export function GapCoachChat({
  essayId,
  initialMessages,
}: {
  essayId: string;
  initialMessages: ChatMessage[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message whenever the thread grows or the drawer opens.
  const messageCount = messages.length;
  useEffect(() => {
    if (open && messageCount >= 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messageCount]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    const now = new Date().toISOString();
    const optimistic: ChatMessage = { role: "user", content: text, at: now };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const res = await fetch("/api/supplemental-essays/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayId, message: text }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
      };
      if (!res.ok) {
        // Roll back the optimistic message.
        setMessages((prev) => prev.filter((m) => m !== optimistic));
        setInput(text);
        setError(data.error ?? "GapCoach couldn't reply.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "",
          at: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m !== optimistic));
      setInput(text);
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand-teal px-4 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="size-4" />
        Ask GapCoach
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-brand-teal" />
          <span className="text-sm font-semibold">GapCoach</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about this prompt, your draft, or how to make it more specific
            to this college. GapCoach coaches — it won't write it for you.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: chat messages are positional and append-only
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-auto bg-brand-teal text-white"
                : "bg-muted text-foreground",
            )}
          >
            {m.role === "assistant" ? (
              <FormattedMessage text={m.content} />
            ) : (
              m.content
            )}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            GapCoach is thinking…
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}

      <div className="border-t border-border p-2">
        <div className="flex items-end gap-1.5">
          <textarea
            value={input}
            onChange={(e) =>
              setInput(e.target.value.slice(0, MAX_CHAT_MESSAGE))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Ask GapCoach…"
            className="min-h-0 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <Button
            size="icon"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            aria-label="Send"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  );
}
