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
  toolPolicies: Record<string, string>;

  setWorkspaceId: (id: number) => void;
  setIdentityName: (name: string) => void;
  setDescription: (desc: string) => void;
  setMcpEnabled: (enabled: boolean) => void;
  toggleBlockedTool: (toolName: string) => void;
  setToolPolicy: (toolName: string, policy: string) => void;
  clearToolPolicies: (toolNames: string[]) => void;
  getConfigSnapshot: () => object;
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

export const useAgentStore = create<AgentState>((set, get) => ({
  workspaceId: null,
  identityName: '',
  description: '',
  permissionSets: mockPermissionSets,
  providerStates: mockProviderStates,
  mcpEnabled: true,
  blockedTools: [],
  toolPolicies: {},

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
  setToolPolicy: (toolName, policy) =>
    set((state) => ({
      toolPolicies: { ...state.toolPolicies, [toolName]: policy },
    })),
  clearToolPolicies: (toolNames) =>
    set((state) => {
      const next = { ...state.toolPolicies };
      toolNames.forEach((name) => delete next[name]);
      return { toolPolicies: next };
    }),
  getConfigSnapshot: () => {
    const { blockedTools, toolPolicies, permissionSets, providerStates } = get();
    return {
      blockedTools,
      toolPolicies,
      providers: permissionSets.map((ps) => ({
        provider: ps.provider,
        scopes: providerStates[ps.provider]?.selectedScopes ?? ps.scopes,
      })),
    };
  },
  resetAgent: () =>
    set({
      workspaceId: null,
      identityName: '',
      description: '',
      blockedTools: [],
      toolPolicies: {},
    }),
}));
