"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAgentStore } from "@/stores/agentStore";
import { PolicyChatMessage } from "@/app/api/policy-chat/route";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Send, Loader2, Bot, User, Wrench } from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PolicyChatSheet({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { getConfigSnapshot, setToolPolicy, toggleBlockedTool, blockedTools, clearToolPolicies } =
    useAgentStore();

  const { messages, sendMessage, status } = useChat<PolicyChatMessage>({
    transport: new DefaultChatTransport({
      api: "/api/policy-chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          configSnapshot: getConfigSnapshot(),
        },
      }),
    }),
    // Client-side tool execution: apply store mutations when model calls tools
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;

      if (toolCall.toolName === "setToolPolicy") {
        const { toolName, policy } = toolCall.args as { toolName: string; policy: string };
        setToolPolicy(toolName, policy);
      }

      if (toolCall.toolName === "blockTool") {
        const { toolName } = toolCall.args as { toolName: string };
        if (!blockedTools.includes(toolName)) {
          toggleBlockedTool(toolName);
        }
      }

      if (toolCall.toolName === "unblockTool") {
        const { toolName } = toolCall.args as { toolName: string };
        if (blockedTools.includes(toolName)) {
          toggleBlockedTool(toolName);
        }
      }

      if (toolCall.toolName === "clearProviderPolicies") {
        const { toolNames } = toolCall.args as { provider: string; toolNames: string[] };
        clearToolPolicies(toolNames);
      }
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] flex flex-col p-0 gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cta" />
            <SheetTitle className="text-sm font-semibold text-foreground">
              Policy Assistant
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Ask me to configure access rules, block tools, or set policies across providers.
          </SheetDescription>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as React.Ref<HTMLDivElement>}>
          <div className="flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3 pt-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center mx-auto">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ask me to configure policies across your tools.
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  {[
                    "Block all write tools for GitHub",
                    "Restrict Gmail sends to internal domains only",
                    "What policies are currently active?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        sendMessage({ text: suggestion });
                      }}
                      className="text-xs text-left px-3 py-2 rounded-xl bg-surface-1 border border-border hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  "flex gap-2",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className="w-6 h-6 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {message.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Parts */}
                <div
                  className={clsx(
                    "flex flex-col gap-1.5 max-w-[80%]",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <div
                          key={i}
                          className={clsx(
                            "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                            message.role === "user"
                              ? "bg-cta text-white rounded-tr-sm"
                              : "bg-surface-1 border border-border text-foreground rounded-tl-sm"
                          )}
                        >
                          {part.text}
                        </div>
                      );
                    }

                    // Tool call parts — show a compact indicator
                    if (part.type.startsWith("tool-")) {
                      const toolName = part.type.replace("tool-", "");
                      const isExecuting =
                        part.state === "input-available" || part.state === "input-streaming";
                      const isDone = part.state === "output-available";

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-2 border border-border"
                        >
                          <Wrench className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {toolName}
                          </span>
                          <Badge
                            variant="outline"
                            className={clsx(
                              "text-[10px] px-1.5 py-0 ml-auto",
                              isDone
                                ? "text-cta border-cta/30 bg-cta/10"
                                : "text-muted-foreground"
                            )}
                          >
                            {isExecuting ? "running" : isDone ? "applied" : part.state}
                          </Badge>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-surface-1 border border-border">
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to configure policies..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm bg-surface-1 border-border rounded-xl"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="rounded-xl h-10 w-10 flex-shrink-0 bg-cta border-2 border-cta-border text-white hover:opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Changes apply to the policy editor in real time.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
