"use client";

import { useState } from "react";
import { ShieldCheck, Clock, Globe, Mail, Lock, Users, Zap, Eye, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  policy: object;
}

const TEMPLATES: PolicyTemplate[] = [
  {
    id: "domain_allowlist",
    name: "Domain allowlist",
    description: "Only allow operations targeting approved domains.",
    icon: <Globe className="w-3.5 h-3.5" />,
    category: "security",
    policy: { version: "1.0", tool: "gmail_send_email", rules: [{ field: "recipient", operator: "ends_with", value: "@acme.com", effect: "allow" }], default_effect: "deny" },
  },
  {
    id: "business_hours",
    name: "Business hours only",
    description: "Restrict execution to 9 AM – 6 PM weekdays.",
    icon: <Clock className="w-3.5 h-3.5" />,
    category: "time",
    policy: { version: "1.0", tool: "gmail_send_email", rules: [{ field: "send_time", operator: "gte", value: "09:00", effect: "allow" }, { field: "send_time", operator: "lte", value: "18:00", effect: "allow" }], default_effect: "deny" },
  },
  {
    id: "no_external",
    name: "Internal only",
    description: "Block all external recipients.",
    icon: <Lock className="w-3.5 h-3.5" />,
    category: "security",
    policy: { version: "1.0", tool: "gmail_send_email", rules: [{ field: "domain", operator: "not_in", value: ["gmail.com", "yahoo.com", "hotmail.com"], effect: "allow" }], default_effect: "deny" },
  },
  {
    id: "read_only",
    name: "Read only",
    description: "Allow reads, deny all writes and mutations.",
    icon: <Eye className="w-3.5 h-3.5" />,
    category: "safety",
    policy: { version: "1.0", tool: "*", rules: [{ field: "operation", operator: "in", value: ["read", "list", "get", "query"], effect: "allow" }], default_effect: "deny" },
  },
  {
    id: "approved_recipients",
    name: "Approved recipients",
    description: "Limit to a curated whitelist of addresses.",
    icon: <Users className="w-3.5 h-3.5" />,
    category: "security",
    policy: { version: "1.0", tool: "gmail_send_email", rules: [{ field: "recipient", operator: "in", value: ["ceo@acme.com", "cto@acme.com", "ops@acme.com"], effect: "allow" }], default_effect: "deny" },
  },
  {
    id: "rate_limit",
    name: "Rate limit",
    description: "Cap daily operations to prevent runaway agents.",
    icon: <Zap className="w-3.5 h-3.5" />,
    category: "cost",
    policy: { version: "1.0", tool: "*", rules: [{ field: "daily_count", operator: "lte", value: "50", effect: "allow" }], default_effect: "deny" },
  },
  {
    id: "no_sensitive_subjects",
    name: "No sensitive subjects",
    description: "Block financial, legal, or HR keywords.",
    icon: <Mail className="w-3.5 h-3.5" />,
    category: "compliance",
    policy: { version: "1.0", tool: "gmail_send_email", rules: [{ field: "subject", operator: "not_contains", value: "invoice", effect: "allow" }, { field: "subject", operator: "not_contains", value: "salary", effect: "allow" }, { field: "subject", operator: "not_contains", value: "legal", effect: "allow" }], default_effect: "allow" },
  },
  {
    id: "allow_all",
    name: "Allow all",
    description: "Permissive baseline for development.",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    category: "dev",
    policy: { version: "1.0", tool: "*", rules: [], default_effect: "allow" },
  },
];

const CATEGORY_STYLE: Record<string, string> = {
  security:   "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  compliance: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  time:       "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  safety:     "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  cost:       "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
  dev:        "bg-muted text-muted-foreground",
};

interface TemplatesProps {
  onApply: (policyJson: string) => void;
}

export function Templates({ onApply }: TemplatesProps) {
  const [applied, setApplied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleApply(t: PolicyTemplate, e: React.MouseEvent) {
    e.stopPropagation();
    onApply(JSON.stringify(t.policy, null, 2));
    setApplied(t.id);
    setTimeout(() => setApplied(null), 1800);
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        One-click policies. Click any card to preview the JSON, then hit <span className="text-foreground font-medium">Use</span> to apply.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TEMPLATES.map((t) => {
          const isExpanded = expanded === t.id;
          const isApplied = applied === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setExpanded(isExpanded ? null : t.id)}
              className={cn(
                "group flex flex-col gap-2.5 p-3.5 rounded-xl border bg-card cursor-pointer transition-all duration-150",
                isExpanded
                  ? "border-brand/50 shadow-[0_0_0_1px_var(--color-brand)]"
                  : "border-border hover:border-foreground/20 hover:bg-surface-1"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide", CATEGORY_STYLE[t.category] ?? CATEGORY_STYLE.dev)}>
                  {t.category}
                </span>
                <button
                  onClick={(e) => handleApply(t, e)}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all",
                    isApplied
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-cta border-2 border-cta-border text-white hover:opacity-90"
                  )}
                >
                  {isApplied ? <><Check className="w-3 h-3" /> Applied</> : "Use"}
                </button>
              </div>

              {/* JSON preview on expand */}
              {isExpanded && (
                <div className="rounded-lg overflow-hidden border border-border mt-0.5">
                  <pre className="bg-editor-bg text-[10px] font-mono text-emerald-400 p-3 overflow-auto max-h-36 leading-relaxed">
                    {JSON.stringify(t.policy, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
