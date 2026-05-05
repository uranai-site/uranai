import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, model, max_tokens, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages is required and must be an array" });
    }

    const response = await client.messages.create({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: max_tokens || 4096,
      ...(system ? { system } : {}),
      messages,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("Fortune API error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
