import { useState, useEffect } from 'react';

export interface RegistryTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  providerId: string;
}

interface UseRegistryToolsReturn {
  toolsByProvider: Record<string, RegistryTool[]>;
  isLoading: boolean;
  error: Error | null;
}

// Mock tools by provider for demonstration
const MOCK_TOOLS: Record<string, RegistryTool[]> = {
  gmail: [
    { name: 'gmail_send_email', description: 'Send an email to one or more recipients', inputSchema: {}, providerId: 'gmail' },
    { name: 'gmail_draft_email', description: 'Create a draft email', inputSchema: {}, providerId: 'gmail' },
    { name: 'gmail_reply', description: 'Reply to an existing email thread', inputSchema: {}, providerId: 'gmail' },
    { name: 'gmail_read_email', description: 'Read the contents of an email', inputSchema: {}, providerId: 'gmail' },
    { name: 'gmail_search', description: 'Search emails by query', inputSchema: {}, providerId: 'gmail' },
  ],
  slack: [
    { name: 'slack_post_message', description: 'Post a message to a channel', inputSchema: {}, providerId: 'slack' },
    { name: 'slack_reply', description: 'Reply to a message thread', inputSchema: {}, providerId: 'slack' },
    { name: 'slack_list_channels', description: 'List available channels', inputSchema: {}, providerId: 'slack' },
    { name: 'slack_read_messages', description: 'Read messages from a channel', inputSchema: {}, providerId: 'slack' },
  ],
  linear: [
    { name: 'linear_create_issue', description: 'Create a new issue', inputSchema: {}, providerId: 'linear' },
    { name: 'linear_update_issue', description: 'Update an existing issue', inputSchema: {}, providerId: 'linear' },
    { name: 'linear_get_issue', description: 'Get issue details', inputSchema: {}, providerId: 'linear' },
    { name: 'linear_search_issues', description: 'Search issues by query', inputSchema: {}, providerId: 'linear' },
  ],
};

export function useRegistryTools(): UseRegistryToolsReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);
  const [toolsByProvider, setToolsByProvider] = useState<Record<string, RegistryTool[]>>({});

  useEffect(() => {
    // Simulate loading from registry
    const timer = setTimeout(() => {
      setToolsByProvider(MOCK_TOOLS);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { toolsByProvider, isLoading, error };
}
