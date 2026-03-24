import { NextRequest, NextResponse } from "next/server";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a policy engine for an AI agent governance platform called Hodor.
Your job is to convert natural language descriptions into structured JSON policy objects.

The policy schema is:
{
  "version": "1.0",
  "tool": "<tool_name>",
  "rules": [
    {
      "field": "<field_name>",
      "operator": "equals|not_equals|contains|not_contains|starts_with|ends_with|regex|in|not_in|gt|lt|gte|lte|between",
      "value": "<value_or_array>",
      "effect": "allow|deny"
    }
  ],
  "default_effect": "allow|deny"
}

Rules:
- Always output ONLY valid JSON, no markdown, no explanation, no code blocks.
- "effect" must be "allow" or "deny".
- "default_effect" is applied when no rule matches.
- Use sensible field names based on the tool context (e.g. for gmail_send_email: "recipient", "from", "subject", "send_time", "domain").
- For time-based rules, use "send_time" field with values like "09:00", "17:00" using gte/lte operators.
- For domain rules on email, use the "domain" field.
- For list-based values, use arrays.
- Be precise, minimal, and correct.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MISTRAL_API_KEY not configured" }, { status: 500 });
  }

  const { prompt, tool } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const userMessage = `Tool: ${tool || "unknown"}
Description: ${prompt}

Generate the JSON policy.`;

  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `Mistral error: ${err}` }, { status: 502 });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(content);
    return NextResponse.json({ policy: parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse policy JSON", raw: content }, { status: 500 });
  }
}
