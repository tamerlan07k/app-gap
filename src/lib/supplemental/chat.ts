// Shared GapCoach chat types for Supplemental Essays — imported by the client
// drawer and the chat route so the message shape never drifts. Client-safe (only
// zod). Kept separate from the Personal Statement chat types so the two features
// stay isolated.

import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(6000),
  at: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatThreadSchema = z.array(chatMessageSchema).max(200);

/** Max length of a single student message. */
export const MAX_CHAT_MESSAGE = 2000;

/** How many prior turns to send back to the model (keeps token cost bounded). */
export const CHAT_HISTORY_TURNS = 12;

/** Max messages stored per essay thread. */
export const MAX_STORED_MESSAGES = 200;
