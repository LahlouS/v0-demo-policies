export interface MCPToolDefinition {
  name: string;
  description: string;
}

// Map scope IDs to tool names
export const SCOPE_TO_TOOLS: Record<string, string[]> = {
  'email.read': ['gmail_read_email', 'gmail_search', 'gmail_list_labels'],
  'email.send': ['gmail_send_email', 'gmail_draft_email', 'gmail_reply'],
  'channels.read': ['slack_list_channels', 'slack_get_channel', 'slack_read_messages'],
  'chat.write': ['slack_post_message', 'slack_reply', 'slack_update_message'],
  'issues.read': ['linear_get_issue', 'linear_search_issues', 'linear_list_projects'],
  'issues.write': ['linear_create_issue', 'linear_update_issue', 'linear_add_comment'],
};

// Tool definitions
const TOOL_DEFINITIONS: Record<string, MCPToolDefinition[]> = {
  gmail: [
    { name: 'gmail_send_email', description: 'Send an email to one or more recipients' },
    { name: 'gmail_draft_email', description: 'Create a draft email' },
    { name: 'gmail_reply', description: 'Reply to an existing email thread' },
    { name: 'gmail_read_email', description: 'Read the contents of an email' },
    { name: 'gmail_search', description: 'Search emails by query' },
    { name: 'gmail_list_labels', description: 'List all email labels' },
  ],
  slack: [
    { name: 'slack_post_message', description: 'Post a message to a channel' },
    { name: 'slack_reply', description: 'Reply to a message thread' },
    { name: 'slack_update_message', description: 'Update an existing message' },
    { name: 'slack_list_channels', description: 'List available channels' },
    { name: 'slack_get_channel', description: 'Get channel details' },
    { name: 'slack_read_messages', description: 'Read messages from a channel' },
  ],
  linear: [
    { name: 'linear_create_issue', description: 'Create a new issue' },
    { name: 'linear_update_issue', description: 'Update an existing issue' },
    { name: 'linear_add_comment', description: 'Add a comment to an issue' },
    { name: 'linear_get_issue', description: 'Get issue details' },
    { name: 'linear_search_issues', description: 'Search issues by query' },
    { name: 'linear_list_projects', description: 'List all projects' },
  ],
};

export function getToolsForScopes(providerId: string, scopes: string[]): MCPToolDefinition[] {
  const providerTools = TOOL_DEFINITIONS[providerId.toLowerCase()] || [];
  
  // Get allowed tool names based on scopes
  const allowedToolNames = new Set<string>();
  scopes.forEach((scope) => {
    const tools = SCOPE_TO_TOOLS[scope] || [];
    tools.forEach((toolName) => allowedToolNames.add(toolName));
  });

  return providerTools.filter((tool) => allowedToolNames.has(tool.name));
}

export function getAllToolsForProvider(providerId: string): MCPToolDefinition[] {
  return TOOL_DEFINITIONS[providerId.toLowerCase()] || [];
}
