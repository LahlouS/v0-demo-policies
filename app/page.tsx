"use client";

import { NextIntlClientProvider } from 'next-intl';
import CreateAgentStepMCP from "@/components/agent/create-agent-step-mcp";

// Mock translations for demonstration
const messages = {
  AgentCreate: {
    mcpConfigTitle: "Fine grained policies configuration",
    mcpConfigDescription: "Fine-tune which tools your agent can access and define policies for each.",
    enableMcpAccess: "Enable MCP Access",
    mcpToggleLabel: "Allow your agent to use MCP tools from connected integrations.",
    mcpToggleDescription: "MCP (Model Context Protocol) allows AI agents to interact with external services.",
    loadingTools: "Loading available tools...",
    mcpToolStats: "{enabled} enabled, {blocked} blocked",
    fineTuneAccess: "Fine-tune tool access",
    fineTuneDescription: "Click on any tool to define granular policies that control what the tool can and cannot do.",
    noServicesSelected: "No services have been selected. Go back to add integrations.",
    backToServices: "Back to Services",
    continue: "Continue",
    expand: "Expand",
    collapse: "Collapse",
    blocked: "Blocked",
  },
};

export default function PoliciesPage() {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <main className="min-h-screen bg-background">
        <CreateAgentStepMCP
          nextStep={() => console.log("Next step")}
          prevStep={() => console.log("Previous step")}
        />
      </main>
    </NextIntlClientProvider>
  );
}
