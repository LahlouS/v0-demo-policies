"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Code2, LayoutList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonEditor } from "./json-editor";
import { VisualBuilder, type PolicyRule } from "./visual-builder";
import { AiEditor } from "./ai-editor";

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

// ─── Draggable Divider Hook ───────────────────────────────────────────────────

function useDraggableDivider(initialLeftPercent = 50, minPercent = 25, maxPercent = 75) {
  const [leftPercent, setLeftPercent] = useState(initialLeftPercent);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(Math.max(minPercent, Math.min(maxPercent, percent)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minPercent, maxPercent]);

  return { leftPercent, handleMouseDown, containerRef };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PolicyEditor({ toolName, toolFields, serviceName, policyJson, onPolicyChange, onNext }: PolicyEditorProps) {
  const [rightEditor, setRightEditor] = useState<"visual" | "json">("visual");
  const [visualRules, setVisualRules] = useState<PolicyRule[]>(() => parseRulesFromJson(policyJson));
  const { leftPercent, handleMouseDown, containerRef } = useDraggableDivider(50, 30, 70);

  // Sync visual rules when policyJson changes from AI or external source
  useEffect(() => {
    setVisualRules(parseRulesFromJson(policyJson));
  }, [policyJson]);

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
    // Visual rules will sync via the useEffect above
  }, [onPolicyChange]);

  const ruleCount = visualRules.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with toggle and review button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0 bg-surface-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {serviceName} / {toolName}
          </span>
          <span className="text-xs text-muted-foreground">
            ({ruleCount} rule{ruleCount !== 1 ? "s" : ""})
          </span>
        </div>
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cta border-2 border-cta-border text-white text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Done
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Split layout */}
      <div ref={containerRef} className="flex-1 flex min-h-0 relative">
        {/* Left: AI Editor */}
        <div 
          className="overflow-y-auto border-r border-border"
          style={{ width: `${leftPercent}%` }}
        >
          <AiEditor toolName={toolName} onAccept={handleAiAccept} />
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-cta/50 active:bg-cta z-10 transition-colors"
          style={{ left: `calc(${leftPercent}% - 2px)` }}
        />

        {/* Right: Visual/JSON toggle + editor */}
        <div 
          className="flex flex-col min-h-0"
          style={{ width: `${100 - leftPercent}%` }}
        >
          {/* Toggle for Visual / JSON */}
          <div className="flex items-center gap-1 p-2 border-b border-border bg-surface-1 flex-shrink-0">
            <button
              onClick={() => setRightEditor("visual")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                rightEditor === "visual"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Visual
            </button>
            <button
              onClick={() => setRightEditor("json")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                rightEditor === "json"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              JSON
            </button>
          </div>

          {/* Editor content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {rightEditor === "json" ? (
              <div className="h-full">
                <JsonEditor value={policyJson} onChange={handleJsonChange} />
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <VisualBuilder
                  rules={visualRules}
                  onChange={handleVisualChange}
                  toolFields={toolFields}
                  toolName={toolName}
                  serviceName={serviceName}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
