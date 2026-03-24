import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  UIMessage,
  InferUITools,
  UIDataTypes,
} from "ai";
import * as z from "zod";

export const maxDuration = 30;

// ─── Tool definitions ─────────────────────────────────────────────────────────

const setToolPolicyTool = tool({
  description:
    "Set or update the JSON policy for a specific tool. Call this when the user asks to restrict, allow, or configure access rules for a tool.",
  inputSchema: z.object({
    toolName: z.string().describe("The exact tool name to update, e.g. gmail_send_email"),
    policy: z.string().describe("A valid JSON string representing the policy object with version, tool, rules, and default_effect fields"),
  }),
});

const blockToolTool = tool({
  description: "Block a tool entirely so the agent cannot use it.",
  inputSchema: z.object({
    toolName: z.string().describe("The exact tool name to block"),
  }),
});

const unblockToolTool = tool({
  description: "Unblock a previously blocked tool so the agent can use it again.",
  inputSchema: z.object({
    toolName: z.string().describe("The exact tool name to unblock"),
  }),
});

const clearProviderPoliciesTool = tool({
  description: "Remove all custom policies for all tools belonging to a specific provider, resetting them to defaults.",
  inputSchema: z.object({
    provider: z.string().describe("The provider name, e.g. gmail, slack, linear"),
    toolNames: z.array(z.string()).describe("List of all tool names for this provider"),
  }),
});

const tools = {
  setToolPolicy: setToolPolicyTool,
  blockTool: blockToolTool,
  unblockTool: unblockToolTool,
  clearProviderPolicies: clearProviderPoliciesTool,
} as const;

export type PolicyChatMessage = UIMessage<never, UIDataTypes, InferUITools<typeof tools>>;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, configSnapshot } = body as {
    messages: PolicyChatMessage[];
    configSnapshot: object;
  };

  const result = streamText({
    model: "openai/gpt-4o",
    system: `You are a policy configuration assistant for an AI agent builder.
You help users configure fine-grained access policies for the tools the agent can use.

CURRENT CONFIGURATION SNAPSHOT:
${JSON.stringify(configSnapshot, null, 2)}

INSTRUCTIONS:
- You can read and update policies using the provided tools.
- When a user asks you to restrict, allow, or configure tool access, call the appropriate tool.
- After calling a tool, explain in plain text what you did and why.
- If the user just asks a question, answer it without calling any tools.
- Policies follow this JSON schema:
  {
    "version": "1.0",
    "tool": "<toolName>",
    "rules": [
      { "field": "<fieldName>", "operator": "eq|neq|contains|starts_with|ends_with|regex", "value": "<value>", "effect": "allow|deny" }
    ],
    "default_effect": "allow|deny"
  }
- Keep responses concise and actionable. Don't repeat the full config back unless asked.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
