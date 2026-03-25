"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useAgentStore } from "@/stores/agentStore";
import { PolicyChatMessage } from "@/app/api/policy-chat/route";
import ReactMarkdown from "react-markdown";
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
import { ShieldCheck, Send, Loader2, Bot, User, Wrench, AlertTriangle } from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Draggable width hook ─────────────────────────────────────────────────────

function useDraggableWidth(initialWidth: number, min: number, max: number) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(initialWidth);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Drag left edge → dragging left increases width
      const delta = startX.current - e.clientX;
      setWidth(Math.min(max, Math.max(min, startWidth.current + delta)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [min, max]);

  return { width, onMouseDown };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PolicyChatSheet({ open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { width, onMouseDown } = useDraggableWidth(420, 320, 900);

  const { getConfigSnapshot, setToolPolicy, toggleBlockedTool, blockedTools, clearToolPolicies } =
    useAgentStore();

  const { messages, sendMessage, status, addToolOutput } = useChat<PolicyChatMessage>({
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
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;

      const input = (toolCall as { toolName: string; toolCallId: string; input?: unknown; args?: unknown }).input
        ?? (toolCall as { toolName: string; toolCallId: string; input?: unknown; args?: unknown }).args
        ?? {};

      let result: string = "ok";

      if (toolCall.toolName === "setToolPolicy") {
        const { toolName, policy } = input as { toolName: string; policy: string };
        setToolPolicy(toolName, policy);
        result = `Policy set for ${toolName}`;
      }

      if (toolCall.toolName === "blockTool") {
        const { toolName } = input as { toolName: string };
        if (!blockedTools.includes(toolName)) toggleBlockedTool(toolName);
        result = `Blocked ${toolName}`;
      }

      if (toolCall.toolName === "unblockTool") {
        const { toolName } = input as { toolName: string };
        if (blockedTools.includes(toolName)) toggleBlockedTool(toolName);
        result = `Unblocked ${toolName}`;
      }

      if (toolCall.toolName === "clearProviderPolicies") {
        const { toolNames } = input as { provider: string; toolNames: string[] };
        clearToolPolicies(toolNames);
        result = `Cleared policies`;
      }

      addToolOutput({
        tool: toolCall.toolName as "setToolPolicy" | "blockTool" | "unblockTool" | "clearProviderPolicies",
        toolCallId: toolCall.toolCallId,
        output: result,
      });
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
        style={{ width: `${width}px`, maxWidth: "100vw" }}
        className="flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* Drag handle on the left edge */}
        <div
          onMouseDown={onMouseDown}
          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-cta/40 transition-colors z-50 group"
          title="Drag to resize"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-12 w-1.5 rounded-full bg-border group-hover:bg-cta/60 transition-colors" />
        </div>

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

        {/* Warning banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <p className="text-xs text-orange-500 font-medium">
            AI can make mistakes — review your policies before validating.
          </p>
        </div>

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
                      onClick={() => sendMessage({ text: suggestion })}
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
                    "flex flex-col gap-1.5 max-w-[85%]",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text" && part.text) {
                      if (message.role === "user") {
                        return (
                          <div
                            key={i}
                            className="px-3 py-2 rounded-2xl rounded-tr-sm bg-cta text-white text-sm leading-relaxed"
                          >
                            {part.text}
                          </div>
                        );
                      }
                      // Assistant: render markdown
                      return (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-2xl rounded-tl-sm bg-surface-1 border border-border text-foreground text-sm leading-relaxed prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        >
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      );
                    }

                    // Tool invocation parts
                    if (part.type === "tool-invocation") {
                      const inv = part.toolInvocation;
                      const isDone = inv.state === "result";
                      const isRunning = inv.state === "call" || inv.state === "partial-call";
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-2 border border-border"
                        >
                          <Wrench className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {inv.toolName}
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
                            {isRunning ? "running" : isDone ? "applied" : inv.state}
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
