"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Layers, ShieldCheck, CheckCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PolicyEditor } from "./policy-editor";

// ─── Data ────────────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id: "sales-agent",
    name: "Sales Agent",
    description: "Outbound prospecting & CRM",
    services: [
      {
        id: "gmail",
        name: "Gmail",
        icon: "G",
        color: "text-red-500",
        tools: [
          { id: "gmail_send_email", name: "gmail_send_email", fields: ["recipient", "from", "subject", "body", "send_time", "domain", "cc", "bcc"] },
          { id: "gmail_read_email", name: "gmail_read_email", fields: ["sender", "subject", "received_at", "label"] },
          { id: "gmail_delete_email", name: "gmail_delete_email", fields: ["email_id", "sender", "age_days"] },
        ],
      },
      {
        id: "attio",
        name: "Attio",
        icon: "A",
        color: "text-violet-500",
        tools: [
          { id: "attio_create_contact", name: "attio_create_contact", fields: ["email", "name", "company", "tags"] },
          { id: "attio_update_deal", name: "attio_update_deal", fields: ["deal_id", "stage", "value", "owner"] },
        ],
      },
      {
        id: "stripe",
        name: "Stripe",
        icon: "S",
        color: "text-indigo-500",
        tools: [
          { id: "stripe_charge_card", name: "stripe_charge_card", fields: ["amount", "currency", "customer_id", "description"] },
          { id: "stripe_refund", name: "stripe_refund", fields: ["charge_id", "amount", "reason"] },
        ],
      },
    ],
  },
  {
    id: "ops-agent",
    name: "Ops Agent",
    description: "Internal operations & data",
    services: [
      {
        id: "postgres",
        name: "Postgres",
        icon: "P",
        color: "text-sky-500",
        tools: [
          { id: "postgres_query", name: "postgres_query", fields: ["table", "operation", "query", "daily_count"] },
          { id: "postgres_insert", name: "postgres_insert", fields: ["table", "columns", "row_count"] },
          { id: "postgres_delete", name: "postgres_delete", fields: ["table", "where_clause", "row_count"] },
        ],
      },
      {
        id: "linear",
        name: "Linear",
        icon: "L",
        color: "text-purple-500",
        tools: [
          { id: "linear_create_issue", name: "linear_create_issue", fields: ["title", "team", "priority", "assignee"] },
          { id: "linear_update_issue", name: "linear_update_issue", fields: ["issue_id", "status", "priority", "assignee"] },
        ],
      },
    ],
  },
  {
    id: "code-agent",
    name: "Code Agent",
    description: "Repository & CI/CD automation",
    services: [
      {
        id: "github",
        name: "GitHub",
        icon: "G",
        color: "text-neutral-400",
        tools: [
          { id: "github_create_pr", name: "github_create_pr", fields: ["repo", "branch", "base", "title", "draft"] },
          { id: "github_merge_pr", name: "github_merge_pr", fields: ["pr_id", "repo", "merge_method"] },
          { id: "github_push_commit", name: "github_push_commit", fields: ["repo", "branch", "message", "files_changed"] },
        ],
      },
    ],
  },
];

export type Tool = { id: string; name: string; fields: string[] };
export type Service = { id: string; name: string; icon: string; color: string; tools: Tool[] };
export type Agent = { id: string; name: string; description: string; services: Service[] };

// ─── localStorage helpers ─────────────────────────────────────────────────────

function storageKey(agentId: string, toolId: string) {
  return `hodor:policy:${agentId}:${toolId}`;
}

function loadPolicy(agentId: string, toolId: string, toolName: string): string {
  if (typeof window === "undefined") return defaultPolicy(toolName);
  const stored = localStorage.getItem(storageKey(agentId, toolId));
  return stored ?? defaultPolicy(toolName);
}

function savePolicy(agentId: string, toolId: string, json: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(agentId, toolId), json);
}

function defaultPolicy(tool: string) {
  return JSON.stringify({ version: "1.0", tool, rules: [], default_effect: "deny" }, null, 2);
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Agent" },
  { id: 2, label: "Tool" },
  { id: 3, label: "Policy" },
  { id: 4, label: "Save" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 select-none">
      {STEPS.map((step, i) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
              active ? "bg-brand text-brand-foreground" :
              done ? "text-muted-foreground" :
              "text-muted-foreground/40"
            )}>
              <span className={cn("text-xs font-medium tabular-nums",
                done && "line-through decoration-muted-foreground/40"
              )}>
                {done ? <CheckCircle className="w-3.5 h-3.5" /> : step.id}
              </span>
              <span className={cn("text-xs font-medium hidden sm:block",
                !active && !done && "opacity-40"
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-6 h-px transition-colors duration-300", done ? "bg-brand/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent, selected, onClick }: { agent: Agent; selected: boolean; onClick: () => void }) {
  const toolCount = agent.services.reduce((n, s) => n + s.tools.length, 0);
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left p-4 rounded-xl border transition-all duration-150",
        selected
          ? "border-brand bg-brand-subtle shadow-[0_0_0_1px_var(--color-brand)]"
          : "border-border bg-card hover:border-foreground/20 hover:bg-surface-1"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-semibold text-sm transition-colors",
            selected ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{agent.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
          </div>
        </div>
        <ChevronRight className={cn("w-4 h-4 mt-0.5 flex-shrink-0 transition-transform",
          selected ? "text-brand rotate-90" : "text-muted-foreground/40 group-hover:text-muted-foreground"
        )} />
      </div>
      <div className="flex items-center gap-3 mt-3 pl-12">
        <span className="text-xs text-muted-foreground">{agent.services.length} services</span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="text-xs text-muted-foreground">{toolCount} tools</span>
      </div>
    </button>
  );
}

// ─── Tool picker ──────────────────────────────────────────────────────────────

function ToolPicker({
  agent,
  selectedToolId,
  onSelect,
}: {
  agent: Agent;
  selectedToolId: string;
  onSelect: (service: Service, tool: Tool) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {agent.services.map((service) => (
        <div key={service.id}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-5 h-5 rounded text-[10px] font-bold bg-muted flex items-center justify-center", service.color)}>
              {service.icon}
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{service.name}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {service.tools.map((tool) => {
              const active = selectedToolId === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => onSelect(service, tool)}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all duration-150",
                    active
                      ? "border-brand bg-brand-subtle shadow-[0_0_0_1px_var(--color-brand)]"
                      : "border-border bg-card hover:border-foreground/20 hover:bg-surface-1"
                  )}
                >
                  <Layers className={cn("w-3.5 h-3.5 flex-shrink-0 transition-colors", active ? "text-brand" : "text-muted-foreground/50")} />
                  <span className={cn("font-mono text-xs truncate", active ? "text-brand font-medium" : "text-foreground")}>{tool.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/50">{tool.fields.length} fields</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Review step ─────────────────────────────────────────────────────────────

function ReviewStep({
  agent,
  service,
  tool,
  policyJson,
  onSave,
  onBack,
}: {
  agent: Agent;
  service: Service;
  tool: Tool;
  policyJson: string;
  onSave: () => void;
  onBack: () => void;
}) {
  let parsed: Record<string, unknown> | null = null;
  let ruleCount = 0;
  try {
    parsed = JSON.parse(policyJson);
    ruleCount = Array.isArray((parsed as { rules?: unknown[] }).rules) ? (parsed as { rules: unknown[] }).rules.length : 0;
  } catch {
    // invalid json
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Policy Summary</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Agent", value: agent.name },
            { label: "Service", value: service.name },
            { label: "Tool", value: tool.name },
            { label: "Rules", value: `${ruleCount} rule${ruleCount !== 1 ? "s" : ""}` },
            { label: "Default", value: (parsed as { default_effect?: string } | null)?.default_effect ?? "—" },
            { label: "Version", value: (parsed as { version?: string } | null)?.version ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground font-mono truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* JSON preview */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-surface-1 border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">policy.json</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand font-medium">
            {ruleCount} {ruleCount === 1 ? "rule" : "rules"}
          </span>
        </div>
        <pre className="text-xs font-mono bg-editor-bg text-editor-fg p-4 overflow-auto max-h-52 leading-relaxed">
          {policyJson}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ShieldCheck className="w-4 h-4" />
          Activate policy
        </button>
      </div>
    </div>
  );
}

// ─── Saved confirmation ───────────────────────────────────────────────────────

function SavedConfirmation({ tool, agent, onReset, onEditAnother }: {
  tool: Tool;
  agent: Agent;
  onReset: () => void;
  onEditAnother: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-brand" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">Policy activated</p>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-mono text-foreground">{tool.name}</span> is now governed by your rules.
        </p>
      </div>
      <div className="flex gap-2 w-full">
        <button
          onClick={onEditAnother}
          className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
        >
          Edit another tool
        </button>
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New policy
        </button>
      </div>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

export function PolicyWizard() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [saved, setSaved] = useState(false);

  const [selectedAgentId, setSelectedAgentId] = useState<string>(AGENTS[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(AGENTS[0].services[0].id);
  const [selectedToolId, setSelectedToolId] = useState<string>(AGENTS[0].services[0].tools[0].id);
  const [policyJson, setPolicyJson] = useState<string>("");

  // Resolve active objects
  const activeAgent = AGENTS.find((a) => a.id === selectedAgentId) ?? AGENTS[0];
  const activeService = activeAgent.services.find((s) => s.id === selectedServiceId) ?? activeAgent.services[0];
  const activeTool = activeService.tools.find((t) => t.id === selectedToolId) ?? activeService.tools[0];

  // Load from localStorage when tool changes
  useEffect(() => {
    const stored = loadPolicy(selectedAgentId, selectedToolId, activeTool.name);
    setPolicyJson(stored);
  }, [selectedAgentId, selectedToolId, activeTool.name]);

  function navigate(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function handleSelectAgent(id: string) {
    const agent = AGENTS.find((a) => a.id === id) ?? AGENTS[0];
    setSelectedAgentId(id);
    setSelectedServiceId(agent.services[0].id);
    setSelectedToolId(agent.services[0].tools[0].id);
  }

  function handleSelectTool(service: Service, tool: Tool) {
    setSelectedServiceId(service.id);
    setSelectedToolId(tool.id);
  }

  const handlePolicyChange = useCallback((json: string) => {
    setPolicyJson(json);
    savePolicy(selectedAgentId, selectedToolId, json);
  }, [selectedAgentId, selectedToolId]);

  function handleSave() {
    savePolicy(selectedAgentId, selectedToolId, policyJson);
    setSaved(true);
  }

  function handleReset() {
    setSaved(false);
    setStep(1);
    setDir(1);
  }

  function handleEditAnother() {
    setSaved(false);
    navigate(2);
  }

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: "Select agent", subtitle: "Which agent needs a policy?" },
    2: { title: "Select tool", subtitle: `${activeAgent.name} · pick the tool to govern` },
    3: { title: "Define policy", subtitle: `${activeTool.name} · set what's allowed` },
    4: { title: "Review & activate", subtitle: "Confirm before going live" },
  };

  const { title, subtitle } = saved
    ? { title: "Done", subtitle: "" }
    : stepTitles[step] ?? stepTitles[1];

  return (
    <div className="w-full max-w-2xl">
      {/* Card */}
      <div className="rounded-2xl border border-border bg-card shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.06)] overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-1">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">hodor</span>
            <span className="text-muted-foreground/30 mx-0.5">/</span>
            <span className="text-sm text-muted-foreground">policies</span>
          </div>
          {!saved && <StepIndicator current={step} />}
        </div>

        {/* Step header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {/* Quick nav breadcrumb — step 3+ */}
            {step >= 2 && !saved && (
              <button
                onClick={() => navigate(step - 1)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>
        </div>

        {/* Step content */}
        <div className={cn("overflow-hidden", step === 3 ? "h-[520px]" : "min-h-[320px]")}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={saved ? "saved" : step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className={cn("h-full", step !== 3 && "p-5")}
            >
              {saved ? (
                <div className="p-5 h-full flex items-center">
                  <SavedConfirmation
                    tool={activeTool}
                    agent={activeAgent}
                    onReset={handleReset}
                    onEditAnother={handleEditAnother}
                  />
                </div>
              ) : step === 1 ? (
                <div className="flex flex-col gap-2.5">
                  {AGENTS.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selected={selectedAgentId === agent.id}
                      onClick={() => handleSelectAgent(agent.id)}
                    />
                  ))}
                  <button
                    onClick={() => navigate(2)}
                    className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : step === 2 ? (
                <div className="flex flex-col gap-4">
                  <ToolPicker
                    agent={activeAgent}
                    selectedToolId={selectedToolId}
                    onSelect={handleSelectTool}
                  />
                  <button
                    onClick={() => navigate(3)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Edit policy for <span className="font-mono">{activeTool.name}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : step === 3 ? (
                <div className="flex flex-col h-full">
                  <PolicyEditor
                    key={`${selectedAgentId}-${selectedToolId}`}
                    toolName={activeTool.name}
                    toolFields={activeTool.fields}
                    serviceName={activeService.name}
                    policyJson={policyJson}
                    onPolicyChange={handlePolicyChange}
                    onNext={() => navigate(4)}
                  />
                </div>
              ) : step === 4 ? (
                <ReviewStep
                  agent={activeAgent}
                  service={activeService}
                  tool={activeTool}
                  policyJson={policyJson}
                  onSave={handleSave}
                  onBack={() => navigate(3)}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-muted-foreground/50 mt-3">
        Policies are enforced in real-time by the Hodor gateway.
      </p>
    </div>
  );
}
