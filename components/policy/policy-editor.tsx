"use client";

import { useState, useCallback, useEffect } from "react";
import { Code2, LayoutList, Sparkles, BookOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonEditor } from "./json-editor";
import { VisualBuilder, type PolicyRule } from "./visual-builder";
import { AiEditor } from "./ai-editor";
import { Templates } from "./templates";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PolicyEditorProps {
  toolName: string;
  toolFields: string[];
  serviceName: string;
  policyJson: string;
  onPolicyChange: (json: string) => void;
  onNext: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRulesFromJson(raw: string): PolicyRule[] {
  try {
    const obj = JSON.parse(raw);
    if (!Array.isArray(obj.rules)) return [];
    return obj.rules.map((r: Record<string, unknown>, i: number) => ({
      id: `rule_${i}_${Date.now() + i}`,
      field: String(r.field ?? ""),
      operator: String(r.operator ?? "equals"),
      value: Array.isArray(r.value) ? r.value.join(", ") : String(r.value ?? ""),
      effect: r.effect === "deny" ? "deny" : "allow",
    }));
  } catch {
    return [];
  }
}

function buildJsonFromRules(currentJson: string, rules: PolicyRule[]): string {
  try {
    const obj = JSON.parse(currentJson);
    obj.rules = rules.map((r) => ({
      field: r.field,
      operator: r.operator,
      value: r.value.includes(",") ? r.value.split(",").map((v) => v.trim()) : r.value,
      effect: r.effect,
    }));
    return JSON.stringify(obj, null, 2);
  } catch {
    return currentJson;
  }
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "visual", label: "Visual", icon: LayoutList },
  { id: "json",   label: "JSON",   icon: Code2 },
  { id: "ai",     label: "AI",     icon: Sparkles },
  { id: "templates", label: "Templates", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Component ────────────────────────────────────────────────────────────────

export function PolicyEditor({ toolName, toolFields, serviceName, policyJson, onPolicyChange, onNext }: PolicyEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("visual");
  const [visualRules, setVisualRules] = useState<PolicyRule[]>([]);

  // Sync rules from JSON whenever tab switches to visual or policyJson changes from outside
  useEffect(() => {
    if (activeTab === "visual") {
      setVisualRules(parseRulesFromJson(policyJson));
    }
    // Only re-sync when switching tabs; policyJson changes via visual are handled by handleVisualChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleJsonChange = useCallback((val: string) => {
    onPolicyChange(val);
  }, [onPolicyChange]);

  const handleVisualChange = useCallback((rules: PolicyRule[]) => {
    setVisualRules(rules);
    const newJson = buildJsonFromRules(policyJson, rules);
    onPolicyChange(newJson);
  }, [policyJson, onPolicyChange]);

  const handleAiAccept = useCallback((json: string) => {
    onPolicyChange(json);
    setActiveTab("visual");
  }, [onPolicyChange]);

  const handleTemplateApply = useCallback((json: string) => {
    onPolicyChange(json);
    setActiveTab("visual");
  }, [onPolicyChange]);

  const ruleCount = visualRules.length;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — Vision Pro pill style */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-full p-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{tab.label}</span>
                {tab.id === "ai" && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cta border-2 border-cta-border text-white text-xs font-medium hover:opacity-90 transition-opacity mb-0.5"
        >
          Review
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab content — fills remaining space */}
      <div className={cn("flex-1 min-h-0", activeTab === "json" ? "overflow-hidden" : "overflow-y-auto")}>
        {activeTab === "json" && (
          <div className="h-full">
            <JsonEditor value={policyJson} onChange={handleJsonChange} />
          </div>
        )}
        {activeTab === "visual" && (
          <VisualBuilder
            rules={visualRules}
            onChange={handleVisualChange}
            toolFields={toolFields}
            toolName={toolName}
            serviceName={serviceName}
          />
        )}
        {activeTab === "ai" && (
          <AiEditor toolName={toolName} onAccept={handleAiAccept} />
        )}
        {activeTab === "templates" && (
          <Templates onApply={handleTemplateApply} />
        )}
      </div>

      {/* Rule count footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-border bg-surface-1">
        <span className="text-xs text-muted-foreground font-mono">
          {serviceName} / {toolName}
        </span>
        <span className="text-xs text-muted-foreground">
          {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
