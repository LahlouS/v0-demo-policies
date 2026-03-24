import { create } from 'zustand';
import { PermissionSet } from '@/types/permissions';
import { AgentProviderState } from '@/types/providers';

interface AgentState {
  workspaceId: number | null;
  identityName: string;
  description: string;
  permissionSets: PermissionSet[];
  providerStates: Record<string, AgentProviderState>;
  mcpEnabled: boolean;
  blockedTools: string[];
  
  setWorkspaceId: (id: number) => void;
  setIdentityName: (name: string) => void;
  setDescription: (desc: string) => void;
  setMcpEnabled: (enabled: boolean) => void;
  toggleBlockedTool: (toolName: string) => void;
  resetAgent: () => void;
}

// Mock data for demonstration
const mockPermissionSets: PermissionSet[] = [
  { provider: 'gmail', scopes: ['email.read', 'email.send'] },
  { provider: 'slack', scopes: ['channels.read', 'chat.write'] },
  { provider: 'linear', scopes: ['issues.read', 'issues.write'] },
];

const mockProviderStates: Record<string, AgentProviderState> = {
  gmail: { selectedScopes: ['email.read', 'email.send'] },
  slack: { selectedScopes: ['channels.read', 'chat.write'] },
  linear: { selectedScopes: ['issues.read', 'issues.write'] },
};

export const useAgentStore = create<AgentState>((set) => ({
  workspaceId: null,
  identityName: '',
  description: '',
  permissionSets: mockPermissionSets,
  providerStates: mockProviderStates,
  mcpEnabled: true,
  blockedTools: [],

  setWorkspaceId: (id) => set({ workspaceId: id }),
  setIdentityName: (name) => set({ identityName: name }),
  setDescription: (desc) => set({ description: desc }),
  setMcpEnabled: (enabled) => set({ mcpEnabled: enabled }),
  toggleBlockedTool: (toolName) =>
    set((state) => ({
      blockedTools: state.blockedTools.includes(toolName)
        ? state.blockedTools.filter((t) => t !== toolName)
        : [...state.blockedTools, toolName],
    })),
  resetAgent: () =>
    set({
      workspaceId: null,
      identityName: '',
      description: '',
      blockedTools: [],
    }),
}));
