"use client";

import { useState } from "react";
import { ShieldCheck, Clock, Globe, Lock, Users, Zap, Eye, Check, Mail, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MCPTool } from "@/types/mcp";

export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  // Map of tool name to policy JSON
  policies: Record<string, object>;
}

// Templates organized by provider
const INTEGRATION_TEMPLATES: Record<string, IntegrationTemplate[]> = {
  gmail: [
    {
      id: "gmail_internal_only",
      name: "Internal Communications Only",
      description: "Restrict all Gmail tools to internal domains only. No external emails allowed.",
      icon: <Lock className="w-4 h-4" />,
      category: "security",
      policies: {
        gmail_send_email: {
          version: "1.0",
          tool: "gmail_send_email",
          rules: [{ field: "recipient", operator: "ends_with", value: "@acme.com", effect: "allow" }],
          default_effect: "deny",
        },
        gmail_draft_email: {
          version: "1.0",
          tool: "gmail_draft_email",
          rules: [{ field: "recipient", operator: "ends_with", value: "@acme.com", effect: "allow" }],
          default_effect: "deny",
        },
        gmail_reply: {
          version: "1.0",
          tool: "gmail_reply",
          rules: [{ field: "recipient", operator: "ends_with", value: "@acme.com", effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
    {
      id: "gmail_business_hours",
      name: "Business Hours Only",
      description: "Only allow sending emails during business hours (9 AM - 6 PM).",
      icon: <Clock className="w-4 h-4" />,
      category: "time",
      policies: {
        gmail_send_email: {
          version: "1.0",
          tool: "gmail_send_email",
          rules: [
            { field: "send_time", operator: "gte", value: "09:00", effect: "allow" },
            { field: "send_time", operator: "lte", value: "18:00", effect: "allow" },
          ],
          default_effect: "deny",
        },
      },
    },
    {
      id: "gmail_approved_recipients",
      name: "Approved Recipients Only",
      description: "Limit email sending to a pre-approved list of recipients.",
      icon: <Users className="w-4 h-4" />,
      category: "security",
      policies: {
        gmail_send_email: {
          version: "1.0",
          tool: "gmail_send_email",
          rules: [{ field: "recipient", operator: "in", value: ["team@acme.com", "support@acme.com"], effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
    {
      id: "gmail_read_only",
      name: "Read Only",
      description: "Allow reading emails but block all sending and drafting.",
      icon: <Eye className="w-4 h-4" />,
      category: "safety",
      policies: {
        gmail_send_email: { version: "1.0", tool: "gmail_send_email", rules: [], default_effect: "deny" },
        gmail_draft_email: { version: "1.0", tool: "gmail_draft_email", rules: [], default_effect: "deny" },
        gmail_reply: { version: "1.0", tool: "gmail_reply", rules: [], default_effect: "deny" },
        gmail_read_email: { version: "1.0", tool: "gmail_read_email", rules: [], default_effect: "allow" },
        gmail_search: { version: "1.0", tool: "gmail_search", rules: [], default_effect: "allow" },
      },
    },
  ],
  slack: [
    {
      id: "slack_approved_channels",
      name: "Approved Channels Only",
      description: "Restrict posting to specific approved channels.",
      icon: <Lock className="w-4 h-4" />,
      category: "security",
      policies: {
        slack_post_message: {
          version: "1.0",
          tool: "slack_post_message",
          rules: [{ field: "channel", operator: "in", value: ["#general", "#team-updates"], effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
    {
      id: "slack_no_dm",
      name: "No Direct Messages",
      description: "Allow channel posts but block all direct messages.",
      icon: <Users className="w-4 h-4" />,
      category: "safety",
      policies: {
        slack_post_message: {
          version: "1.0",
          tool: "slack_post_message",
          rules: [{ field: "channel", operator: "starts_with", value: "#", effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
    {
      id: "slack_rate_limited",
      name: "Rate Limited",
      description: "Limit to 20 messages per day to prevent spam.",
      icon: <Zap className="w-4 h-4" />,
      category: "cost",
      policies: {
        slack_post_message: {
          version: "1.0",
          tool: "slack_post_message",
          rules: [{ field: "daily_count", operator: "lte", value: "20", effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
  ],
  linear: [
    {
      id: "linear_read_only",
      name: "Read Only",
      description: "Allow viewing issues but block creating or modifying them.",
      icon: <Eye className="w-4 h-4" />,
      category: "safety",
      policies: {
        linear_create_issue: { version: "1.0", tool: "linear_create_issue", rules: [], default_effect: "deny" },
        linear_update_issue: { version: "1.0", tool: "linear_update_issue", rules: [], default_effect: "deny" },
        linear_get_issue: { version: "1.0", tool: "linear_get_issue", rules: [], default_effect: "allow" },
        linear_search_issues: { version: "1.0", tool: "linear_search_issues", rules: [], default_effect: "allow" },
      },
    },
    {
      id: "linear_team_restricted",
      name: "Team Restricted",
      description: "Only allow operations on specific teams.",
      icon: <Users className="w-4 h-4" />,
      category: "security",
      policies: {
        linear_create_issue: {
          version: "1.0",
          tool: "linear_create_issue",
          rules: [{ field: "team", operator: "in", value: ["Engineering", "Product"], effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
    {
      id: "linear_no_high_priority",
      name: "No High Priority",
      description: "Block creating urgent or high priority issues.",
      icon: <AlertTriangle className="w-4 h-4" />,
      category: "compliance",
      policies: {
        linear_create_issue: {
          version: "1.0",
          tool: "linear_create_issue",
          rules: [{ field: "priority", operator: "not_in", value: ["urgent", "high"], effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
  ],
  notion: [
    {
      id: "notion_read_only",
      name: "Read Only",
      description: "Allow reading pages but block all modifications.",
      icon: <Eye className="w-4 h-4" />,
      category: "safety",
      policies: {
        notion_create_page: { version: "1.0", tool: "notion_create_page", rules: [], default_effect: "deny" },
        notion_update_page: { version: "1.0", tool: "notion_update_page", rules: [], default_effect: "deny" },
        notion_delete_page: { version: "1.0", tool: "notion_delete_page", rules: [], default_effect: "deny" },
        notion_get_page: { version: "1.0", tool: "notion_get_page", rules: [], default_effect: "allow" },
        notion_search: { version: "1.0", tool: "notion_search", rules: [], default_effect: "allow" },
      },
    },
    {
      id: "notion_no_delete",
      name: "No Deletions",
      description: "Allow all operations except deleting pages.",
      icon: <ShieldCheck className="w-4 h-4" />,
      category: "safety",
      policies: {
        notion_delete_page: { version: "1.0", tool: "notion_delete_page", rules: [], default_effect: "deny" },
      },
    },
  ],
  github: [
    {
      id: "github_read_only",
      name: "Read Only",
      description: "Allow reading code but block all modifications.",
      icon: <Eye className="w-4 h-4" />,
      category: "safety",
      policies: {
        github_push: { version: "1.0", tool: "github_push", rules: [], default_effect: "deny" },
        github_create_pr: { version: "1.0", tool: "github_create_pr", rules: [], default_effect: "deny" },
        github_merge_pr: { version: "1.0", tool: "github_merge_pr", rules: [], default_effect: "deny" },
        github_read_file: { version: "1.0", tool: "github_read_file", rules: [], default_effect: "allow" },
        github_list_files: { version: "1.0", tool: "github_list_files", rules: [], default_effect: "allow" },
      },
    },
    {
      id: "github_protected_branches",
      name: "Protected Branches",
      description: "Block direct pushes to main/master branches.",
      icon: <Lock className="w-4 h-4" />,
      category: "security",
      policies: {
        github_push: {
          version: "1.0",
          tool: "github_push",
          rules: [{ field: "branch", operator: "not_in", value: ["main", "master", "production"], effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
    {
      id: "github_repo_restricted",
      name: "Repository Restricted",
      description: "Only allow operations on specific repositories.",
      icon: <Users className="w-4 h-4" />,
      category: "security",
      policies: {
        github_push: {
          version: "1.0",
          tool: "github_push",
          rules: [{ field: "repository", operator: "in", value: ["acme/docs", "acme/website"], effect: "allow" }],
          default_effect: "deny",
        },
        github_create_pr: {
          version: "1.0",
          tool: "github_create_pr",
          rules: [{ field: "repository", operator: "in", value: ["acme/docs", "acme/website"], effect: "allow" }],
          default_effect: "deny",
        },
      },
    },
  ],
  figma: [
    {
      id: "figma_read_only",
      name: "Read Only",
      description: "Allow viewing designs but block all modifications.",
      icon: <Eye className="w-4 h-4" />,
      category: "safety",
      policies: {
        figma_edit_node: { version: "1.0", tool: "figma_edit_node", rules: [], default_effect: "deny" },
        figma_create_component: { version: "1.0", tool: "figma_create_component", rules: [], default_effect: "deny" },
        figma_get_file: { version: "1.0", tool: "figma_get_file", rules: [], default_effect: "allow" },
        figma_get_comments: { version: "1.0", tool: "figma_get_comments", rules: [], default_effect: "allow" },
      },
    },
    {
      id: "figma_comment_only",
      name: "Comment Only",
      description: "Allow adding comments but block design modifications.",
      icon: <Mail className="w-4 h-4" />,
      category: "compliance",
      policies: {
        figma_edit_node: { version: "1.0", tool: "figma_edit_node", rules: [], default_effect: "deny" },
        figma_add_comment: { version: "1.0", tool: "figma_add_comment", rules: [], default_effect: "allow" },
      },
    },
  ],
};

// Default templates for any provider
const DEFAULT_TEMPLATES: IntegrationTemplate[] = [
  {
    id: "allow_all",
    name: "Allow All",
    description: "Permissive baseline - allows all operations.",
    icon: <ShieldCheck className="w-4 h-4" />,
    category: "dev",
    policies: {},
  },
  {
    id: "read_only",
    name: "Read Only",
    description: "Block all write operations, allow only reads.",
    icon: <Eye className="w-4 h-4" />,
    category: "safety",
    policies: {},
  },
  {
    id: "rate_limited",
    name: "Rate Limited",
    description: "Limit daily operations to prevent runaway usage.",
    icon: <Zap className="w-4 h-4" />,
    category: "cost",
    policies: {},
  },
];

const CATEGORY_STYLE: Record<string, string> = {
  security: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  compliance: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  time: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  safety: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  cost: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
  dev: "bg-muted text-muted-foreground",
};

interface IntegrationTemplatesProps {
  providerId: string;
  tools: MCPTool[];
  onApply: (policies: Record<string, string>) => void;
}

export function IntegrationTemplates({ providerId, tools, onApply }: IntegrationTemplatesProps) {
  const [applied, setApplied] = useState<string | null>(null);

  // Get templates for this provider, or fall back to defaults
  const templates = INTEGRATION_TEMPLATES[providerId.toLowerCase()] || DEFAULT_TEMPLATES;

  function handleApply(template: IntegrationTemplate) {
    // Convert the policies object to JSON strings
    const policiesAsJson: Record<string, string> = {};
    
    // If template has specific policies, use them
    if (Object.keys(template.policies).length > 0) {
      Object.entries(template.policies).forEach(([toolName, policy]) => {
        policiesAsJson[toolName] = JSON.stringify(policy, null, 2);
      });
    } else {
      // For generic templates like "read_only", apply to all tools
      tools.forEach((tool) => {
        let defaultEffect = "allow";
        if (template.id === "read_only" && !tool.name.includes("read") && !tool.name.includes("get") && !tool.name.includes("list") && !tool.name.includes("search")) {
          defaultEffect = "deny";
        }
        policiesAsJson[tool.name] = JSON.stringify({
          version: "1.0",
          tool: tool.name,
          rules: [],
          default_effect: defaultEffect,
        }, null, 2);
      });
    }

    onApply(policiesAsJson);
    setApplied(template.id);
    setTimeout(() => setApplied(null), 1800);
  }

  // Count how many tools each template affects
  const getAffectedToolsCount = (template: IntegrationTemplate): number => {
    if (Object.keys(template.policies).length === 0) {
      return tools.length; // Generic templates affect all tools
    }
    return Object.keys(template.policies).filter((toolName) =>
      tools.some((t) => t.name === toolName)
    ).length;
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Apply pre-configured policies to all tools in this integration. These templates will override any existing policies.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {templates.map((template) => {
          const isApplied = applied === template.id;
          const affectedTools = getAffectedToolsCount(template);

          return (
            <div
              key={template.id}
              className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-surface-1 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-1 flex items-center justify-center text-muted-foreground flex-shrink-0">
                {template.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide",
                    CATEGORY_STYLE[template.category] ?? CATEGORY_STYLE.dev
                  )}>
                    {template.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                <p className="text-[10px] text-muted-foreground/60">
                  Affects {affectedTools} tool{affectedTools !== 1 ? "s" : ""}
                </p>
              </div>

              <button
                onClick={() => handleApply(template)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                  isApplied
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-cta border-2 border-cta-border text-white hover:opacity-90"
                )}
              >
                {isApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Applied
                  </>
                ) : (
                  "Apply"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            No templates available for this integration yet.
          </p>
        </div>
      )}
    </div>
  );
}
