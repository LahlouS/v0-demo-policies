import { NativeProvider } from '@/types/providers';

// Using placeholder SVG data URIs for demo - replace with actual logos in production
const PLACEHOLDER_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23374151'/%3E%3C/svg%3E";

const PROVIDERS: NativeProvider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    logo: PLACEHOLDER_LOGO,
    description: 'Send and manage emails',
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: PLACEHOLDER_LOGO,
    description: 'Team communication',
  },
  {
    id: 'linear',
    name: 'Linear',
    logo: PLACEHOLDER_LOGO,
    description: 'Issue tracking',
  },
  {
    id: 'notion',
    name: 'Notion',
    logo: PLACEHOLDER_LOGO,
    description: 'Documentation and wikis',
  },
  {
    id: 'github',
    name: 'GitHub',
    logo: PLACEHOLDER_LOGO,
    description: 'Code repository',
  },
  {
    id: 'figma',
    name: 'Figma',
    logo: PLACEHOLDER_LOGO,
    description: 'Design collaboration',
  },
];

export function getProviderById(id: string): NativeProvider | undefined {
  return PROVIDERS.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

export function getAllProviders(): NativeProvider[] {
  return PROVIDERS;
}
