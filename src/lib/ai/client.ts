import { createOpenAI } from "@ai-sdk/openai";
import { env } from "~/env";

// Vercel AI Gateway — routes to multiple model providers through a single
// authenticated endpoint. Model IDs use the format "provider/model-name".
// Feature configs (model names, temperature, etc.) live in ~/lib/ai/config.
export const gateway = createOpenAI({
  apiKey: env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1",
});
