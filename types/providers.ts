export interface AgentProviderState {
  selectedScopes: string[];
}

export interface NativeProvider {
  id: string;
  name: string;
  logo: string;
  darkLogo?: string;
  description?: string;
}

export interface ProviderInput {
  id: string;
  provider: string;
  apiKey: string;
  showKey: boolean;
}
