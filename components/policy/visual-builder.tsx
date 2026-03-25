"use client";

import { useState, useCallback } from "react";
import {
  DndContext, closestCenter, KeyboardSensor,
  PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  field: string;
  operator: string;
  value: string;
  effect: "allow" | "deny";
}

interface VisualBuilderProps {
  rules: PolicyRule[];
  onChange: (rules: PolicyRule[]) => void;
  toolFields: string[];
  toolName: string;
  serviceName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPERATORS = [
  { value: "equals",       label: "equals" },
  { value: "not_equals",   label: "≠ not equals" },
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with",  label: "starts with" },
  { value: "ends_with",    label: "ends with" },
  { value: "regex",        label: "matches regex" },
  { value: "in",           label: "in list" },
  { value: "not_in",       label: "not in list" },
  { value: "gt",           label: "> greater than" },
  { value: "lt",           label: "< less than" },
  { value: "gte",          label: "≥ at least" },
  { value: "lte",          label: "≤ at most" },
];

// ─── Row ──────────────────────────────────────────────────────────────────────

function RuleRow({
  rule, toolFields, onUpdate, onRemove,
}: {
  rule: PolicyRule;
  toolFields: string[];
  onUpdate: (updated: PolicyRule) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rule.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const fieldCls = "h-9 w-full rounded-lg border border-border bg-input px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors truncate";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group grid items-center gap-2 p-2 rounded-xl border border-border bg-card transition-shadow",
        "grid-cols-[16px_60px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_24px]",
        isDragging ? "shadow-2xl opacity-80 z-50" : "hover:border-foreground/15",
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Effect toggle */}
      <button
        onClick={() => onUpdate({ ...rule, effect: rule.effect === "allow" ? "deny" : "allow" })}
        className={cn(
          "flex items-center justify-center gap-1 w-full h-9 px-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors whitespace-nowrap",
          rule.effect === "allow"
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
            : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
        )}
      >
        {rule.effect === "allow" ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
        {rule.effect}
      </button>

      {/* Field */}
      <select
        value={rule.field}
        onChange={(e) => onUpdate({ ...rule, field: e.target.value })}
        className={fieldCls}
      >
        {toolFields.map((f) => <option key={f} value={f}>{f}</option>)}
        {!toolFields.includes(rule.field) && rule.field && (
          <option value={rule.field}>{rule.field}</option>
        )}
      </select>

      {/* Operator */}
      <select
        value={rule.operator}
        onChange={(e) => onUpdate({ ...rule, operator: e.target.value })}
        className={fieldCls}
      >
        {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
      </select>

      {/* Value */}
      <input
        type="text"
        value={rule.value}
        onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
        placeholder="value"
        className={cn(fieldCls, "font-mono placeholder:text-muted-foreground/30")}
      />

      {/* Remove */}
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        aria-label="Remove rule"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function VisualBuilder({ rules, onChange, toolFields }: VisualBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      onChange(arrayMove(rules, oldIndex, newIndex));
    }
  }

  const addRule = useCallback(() => {
    onChange([...rules, {
      id: `rule_${Date.now()}`,
      field: toolFields[0] ?? "recipient",
      operator: "equals",
      value: "",
      effect: "allow",
    }]);
  }, [rules, onChange, toolFields]);

  const updateRule = useCallback((id: string, updated: PolicyRule) => {
    onChange(rules.map((r) => r.id === id ? updated : r));
  }, [rules, onChange]);

  const removeRule = useCallback((id: string) => {
    onChange(rules.filter((r) => r.id !== id));
  }, [rules, onChange]);

  return (
    <div className="flex flex-col gap-2.5 p-4">
      {/* Column labels + Clear all */}
      {rules.length > 0 && (
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="grid items-center gap-2 flex-1 grid-cols-[16px_60px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_24px]">
            <span />
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Effect</span>
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Field</span>
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Operator</span>
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Value</span>
            <span />
          </div>
          <button
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-2"
            aria-label="Clear all rules"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                toolFields={toolFields}
                onUpdate={(updated) => updateRule(rule.id, updated)}
                onRemove={() => removeRule(rule.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {rules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <div className="w-10 h-10 rounded-xl border border-dashed border-border flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No rules yet</p>
          <p className="text-xs text-muted-foreground/50">Add a rule below to define what this tool can and cannot do.</p>
        </div>
      )}

      <button
        onClick={addRule}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-surface-1 transition-all self-start mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add rule
      </button>
    </div>
  );
}
