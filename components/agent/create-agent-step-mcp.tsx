"use client";

// REACT
import { useState, useCallback, useMemo } from "react";

// NEXT-INTL
import { useTranslations } from "next-intl";



// STORE
import { useAgentStore } from "@/stores/agentStore";

// SHADCN
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


// FRAMER MOTION
import { motion, AnimatePresence } from "framer-motion";

// CLSX
import clsx from "clsx";

// DATA
import { getProviderById } from "@/data/providers";
import {
  getToolsForScopes as getToolsForScopesFallback,
  SCOPE_TO_TOOLS,
} from "@/data/mcpTools";

// HOOKS
import { useRegistryTools, RegistryTool } from "@/hooks/useRegistryTools";

// LUCIDE
import { Info, Zap, ChevronRight, ShieldCheck, Settings2, ChevronDown } from "lucide-react";

// TYPES
import { PermissionSet } from "@/types/permissions";
import { AgentProviderState } from "@/types/providers";
import { MCPTool } from "@/types/mcp";

// POLICY COMPONENTS
import { PolicyEditor } from "@/components/policy/policy-editor";
import { IntegrationTemplates } from "@/components/policy/integration-templates";

// TYPESCRIPT
type Props = {
  nextStep: () => void;
  prevStep: () => void;
};

// Tool fields by provider (for the visual builder)
const TOOL_FIELDS: Record<string, string[]> = {
  gmail: ["recipient", "subject", "body", "cc", "bcc", "domain", "attachment_size"],
  slack: ["channel", "message", "thread_ts", "user", "workspace"],
  linear: ["project", "team", "assignee", "priority", "status", "label"],
  notion: ["page_id", "database_id", "title", "content", "properties"],
  figma: ["file_id", "node_id", "comment", "version"],
  github: ["repository", "branch", "file_path", "commit_message", "pr_title"],
  default: ["field_1", "field_2", "field_3"],
};

// Default policy for a tool
function getDefaultPolicy(toolName: string): string {
  return JSON.stringify({
    version: "1.0",
    tool: toolName,
    rules: [],
    default_effect: "allow",
  }, null, 2);
}

const CreateAgentStepMCP = ({ nextStep, prevStep }: Props) => {
  // Translations
  const t = useTranslations("AgentCreate");

  // Store
  const {
    permissionSets,
    providerStates,
    blockedTools,
    toggleBlockedTool,
  } = useAgentStore();

  // Registry Hook
  const { toolsByProvider } = useRegistryTools();

  // States
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedTool, setExpandedTool] = useState<{ name: string; provider: string } | null>(null);
  const [toolPolicies, setToolPolicies] = useState<Record<string, string>>({});
  const [showIntegrationTemplates, setShowIntegrationTemplates] = useState<string | null>(null);

  // Helper to get tools for a provider from registry or fallback
  const getToolsForProviderFromRegistry = useCallback(
    (providerId: string): RegistryTool[] => {
      const normalizedId = providerId.toLowerCase();
      return toolsByProvider[normalizedId] || [];
    },
    [toolsByProvider],
  );

  // Helper to filter tools by scopes
  const getToolsForScopesFromRegistry = useCallback(
    (providerId: string, selectedScopes: string[]): RegistryTool[] => {
      const providerTools = getToolsForProviderFromRegistry(providerId);

      if (providerTools.length === 0) {
        // Fallback to hardcoded data if registry is empty
        const fallbackTools = getToolsForScopesFallback(providerId, selectedScopes);
        return fallbackTools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: {},
          providerId: providerId.toLowerCase(),
        }));
      }

      // Filter by scopes
      const allowedToolNames = new Set<string>();
      selectedScopes.forEach((scopeId) => {
        const toolsForScope = SCOPE_TO_TOOLS[scopeId] || [];
        toolsForScope.forEach((toolName) => allowedToolNames.add(toolName));
      });

      return providerTools.filter((tool) => allowedToolNames.has(tool.name));
    },
    [getToolsForProviderFromRegistry],
  );

  // Memo - Get Available Tools
  const availableTools: MCPTool[] = useMemo(() => {
    const tools: MCPTool[] = [];

    permissionSets.forEach((permSet: PermissionSet) => {
      const providerId: string = permSet.provider;
      const providerState: AgentProviderState =
        providerStates[providerId] ||
        providerStates[providerId.toUpperCase()] ||
        providerStates[providerId.toLowerCase()];

      const selectedScopes = providerState?.selectedScopes || [];

      if (selectedScopes.length === 0) {
        console.warn(
          `[MCP] No scopes found for provider ${providerId}. providerStates:`,
          Object.keys(providerStates),
        );
        return;
      }

      const allowedTools = getToolsForScopesFromRegistry(providerId, selectedScopes);

      allowedTools.forEach((tool: RegistryTool) => {
        tools.push({
          name: tool.name,
          description: tool.description,
          provider: providerId.toLowerCase(),
          isBlocked: blockedTools.includes(tool.name),
        });
      });
    });

    return tools;
  }, [permissionSets, providerStates, blockedTools, getToolsForScopesFromRegistry]);

  // Group tools by provider
  const groupedToolsByProvider = useMemo(() => {
    const grouped: Record<string, MCPTool[]> = {};
    availableTools.forEach((tool: MCPTool) => {
      if (!grouped[tool.provider]) {
        grouped[tool.provider] = [];
      }
      grouped[tool.provider].push(tool);
    });
    return grouped;
  }, [availableTools]);

  // Callback - Toggle Provider Expansion
  const toggleProviderExpanded = useCallback((providerId: string) => {
    setExpandedProviders((prev: Set<string>) => {
      const next: Set<string> = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }, []);

  // Callback - Toggle Tool Expansion
  const toggleToolExpanded = useCallback((toolName: string, provider: string) => {
    if (expandedTool?.name === toolName) {
      setExpandedTool(null);
    } else {
      // Initialize policy if not exists
      if (!toolPolicies[toolName]) {
        setToolPolicies((prev) => ({
          ...prev,
          [toolName]: getDefaultPolicy(toolName),
        }));
      }
      setExpandedTool({ name: toolName, provider });
    }
  }, [expandedTool, toolPolicies]);

  // Callback - Update Tool Policy
  const updateToolPolicy = useCallback((toolName: string, json: string) => {
    setToolPolicies((prev) => ({
      ...prev,
      [toolName]: json,
    }));
  }, []);

  // Callback - Restore Provider Policies
  const restoreProviderPolicies = useCallback((toolNames: string[]) => {
    setToolPolicies((prev) => {
      const next = { ...prev };
      toolNames.forEach((name) => delete next[name]);
      return next;
    });
  }, []);

  // Callback - Apply Integration Template
  const applyIntegrationTemplate = useCallback((providerId: string, policies: Record<string, string>) => {
    setToolPolicies((prev) => ({
      ...prev,
      ...policies,
    }));
    setShowIntegrationTemplates(null);
  }, []);

  // Get tool fields for the active tool
  const getToolFields = useCallback((provider: string): string[] => {
    return TOOL_FIELDS[provider.toLowerCase()] || TOOL_FIELDS.default;
  }, []);

  // Handler - Continue
  const handleContinue = () => {
    nextStep();
  };

  // Check if a tool has a custom policy
  const hasCustomPolicy = (toolName: string): boolean => {
    const policy = toolPolicies[toolName];
    if (!policy) return false;
    try {
      const parsed = JSON.parse(policy);
      return parsed.rules && parsed.rules.length > 0;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-start h-full w-full px-8 py-12 max-w-4xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-medium text-foreground">
          {t("mcpConfigTitle")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("mcpConfigDescription")}
        </p>
      </div>

      {/* TOOL CONFIGURATION */}
      <AnimatePresence>
        {availableTools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full space-y-4"
          >
            {/* INFO BANNER */}
            <div className="flex items-start gap-3 p-4 bg-accent border border-border rounded-2xl">
              <Info className="size-5 text-accent-interactive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("fineTuneAccess")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("fineTuneDescription")}
                </p>
              </div>
            </div>

            {/* TOOLS BY PROVIDER */}
            <div className="space-y-3">
              {Object.entries(groupedToolsByProvider).map(
                ([providerId, tools]: [string, MCPTool[]]) => {
                  const provider = getProviderById(providerId);
                  const isExpanded: boolean = expandedProviders.has(providerId);
                  const blockedCount: number = tools.filter((t: MCPTool) => t.isBlocked).length;
                  const policiesCount: number = tools.filter((t: MCPTool) => hasCustomPolicy(t.name)).length;

                  return (
                    <div
                      key={providerId}
                      className="border border-border rounded-xl overflow-hidden bg-card"
                    >
                      {/* PROVIDER HEADER */}
                      <div className="flex items-center justify-between p-4 hover:bg-surface-1 transition-colors">
                        <button
                          type="button"
                          onClick={() => toggleProviderExpanded(providerId)}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          {/* Provider Logo */}
                          <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                              {(provider?.name || providerId).slice(0, 2)}
                            </span>
                          </div>
                          <div className="text-left">
                            <h4 className="font-medium text-foreground">
                              {provider?.name || providerId}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {tools.length - blockedCount} enabled, {blockedCount} blocked
                              {policiesCount > 0 && (
                                <>
                                  <span className="text-cta ml-1">
                                    • {policiesCount} policies
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      restoreProviderPolicies(tools.map((t) => t.name));
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                                  >
                                    • restore
                                  </button>
                                </>
                              )}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Integration Templates Button */}
                          <button
                            onClick={() => setShowIntegrationTemplates(providerId)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-surface-1 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors border border-border"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Templates
                          </button>

                          <Badge
                            variant="outline"
                            onClick={() => toggleProviderExpanded(providerId)}
                            className={clsx(
                              "cursor-pointer",
                              isExpanded
                                ? "bg-surface-1"
                                : "bg-card hover:bg-surface-1"
                            )}
                          >
                            <ChevronRight className={clsx(
                              "w-3.5 h-3.5 mr-1 transition-transform",
                              isExpanded && "rotate-90"
                            )} />
                            {isExpanded ? t("collapse") : t("expand")}
                          </Badge>
                        </div>
                      </div>

                      {/* TOOL LIST */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border divide-y divide-border">
                              {tools.map((tool) => {
                                const hasPolicy = hasCustomPolicy(tool.name);
                                const isToolExpanded = expandedTool?.name === tool.name;

                                return (
                                  <div key={tool.name} className="bg-card">
                                    {/* Tool Row */}
                                    <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-1 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <Checkbox
                                          id={tool.name}
                                          checked={!tool.isBlocked}
                                          onCheckedChange={() => toggleBlockedTool(tool.name)}
                                        />
                                        <Label
                                          htmlFor={tool.name}
                                          className="flex flex-col cursor-pointer gap-0"
                                        >
                                          <span
                                            className={clsx(
                                              "text-sm font-mono text-start w-full",
                                              tool.isBlocked
                                                ? "text-muted-foreground line-through"
                                                : "text-foreground",
                                            )}
                                          >
                                            {tool.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground text-start w-full">
                                            {tool.description}
                                          </span>
                                        </Label>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {hasPolicy && (
                                          <Badge variant="outline" className="bg-cta/10 text-cta border-cta/30">
                                            <ShieldCheck className="w-3 h-3 mr-1" />
                                            Policy
                                          </Badge>
                                        )}
                                        {tool.isBlocked ? (
                                          <Badge
                                            variant="outline"
                                            className="text-destructive border-destructive/30 bg-destructive/10"
                                          >
                                            {t("blocked")}
                                          </Badge>
                                        ) : (
                                          <button
                                            onClick={() => toggleToolExpanded(tool.name, tool.provider)}
                                            className={clsx(
                                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all",
                                              isToolExpanded 
                                                ? "bg-surface-2 border-2 border-border text-foreground" 
                                                : "bg-cta border-2 border-cta-border text-white hover:opacity-90"
                                            )}
                                          >
                                            <Settings2 className="w-3.5 h-3.5" />
                                            Policy
                                            <ChevronDown className={clsx(
                                              "w-3.5 h-3.5 transition-transform",
                                              isToolExpanded && "rotate-180"
                                            )} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Inline Policy Editor */}
                                    <AnimatePresence>
                                      {isToolExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden border-t border-border"
                                        >
                                          <div className="h-[500px] bg-surface-1">
                                            <PolicyEditor
                                              toolName={tool.name}
                                              toolFields={getToolFields(tool.provider)}
                                              serviceName={tool.provider}
                                              policyJson={toolPolicies[tool.name] || getDefaultPolicy(tool.name)}
                                              onPolicyChange={(json) => updateToolPolicy(tool.name, json)}
                                              onNext={() => setExpandedTool(null)}
                                            />
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                },
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPTY STATE */}
      {availableTools.length === 0 && (
        <div className="w-full p-8 text-center bg-surface-1 border border-border rounded-2xl">
          <Zap className="size-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {t("noServicesSelected")}
          </p>
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex w-full justify-between pt-8 border-t border-border pb-12">
        <Button variant="back" onClick={prevStep}>
          {t("backToServices")}
        </Button>
        <Button variant="submit" onClick={handleContinue}>
          {t("continue")}
        </Button>
      </div>

      {/* INTEGRATION TEMPLATES DIALOG */}
      <Dialog 
        open={showIntegrationTemplates !== null} 
        onOpenChange={(open) => !open && setShowIntegrationTemplates(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="w-5 h-5 text-cta" />
              Policy Templates for {showIntegrationTemplates && getProviderById(showIntegrationTemplates)?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apply pre-configured policy templates to quickly set up common access patterns.
            </DialogDescription>
          </DialogHeader>
          {showIntegrationTemplates && (
            <IntegrationTemplates
              providerId={showIntegrationTemplates}
              tools={groupedToolsByProvider[showIntegrationTemplates] || []}
              onApply={(policies) => applyIntegrationTemplate(showIntegrationTemplates, policies)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateAgentStepMCP;
