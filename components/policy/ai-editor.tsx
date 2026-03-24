"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiEditorProps {
  toolName: string;
  onAccept: (policyJson: string) => void;
}

const SUGGESTIONS = [
  "Only allow emails to company domains ending in @acme.com",
  "Block sending emails between 10 PM and 6 AM",
  "Only allow emails to addresses on the approved whitelist",
  "Deny any email with 'urgent' or 'invoice' in the subject",
  "Allow sends only to recipients in the CRM contacts list",
  "Cap daily sends at 50 emails",
];

export function AiEditor({ toolName, onAccept }: AiEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [preview, setPreview] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  async function generate() {
    if (!prompt.trim()) return;
    setStatus("loading");
    setPreview("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/policy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), tool: toolName }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Unknown error"); setStatus("error"); return; }
      setPreview(JSON.stringify(data.policy, null, 2));
      setStatus("success");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setStatus("error");
    }
  }

  function reset() { setPrompt(""); setPreview(""); setStatus("idle"); setErrorMsg(""); }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Prompt box */}
      <div className={cn(
        "relative rounded-xl border bg-card transition-all duration-200",
        status === "loading"
          ? "border-brand/50 shadow-[0_0_0_2px_var(--color-brand-muted)]"
          : "border-border focus-within:border-brand/50 focus-within:shadow-[0_0_0_2px_var(--color-brand-muted)]"
      )}>
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-1.5">
          <Sparkles className={cn(
            "w-4 h-4 mt-0.5 flex-shrink-0 transition-colors",
            status === "loading" ? "text-brand animate-pulse" : "text-muted-foreground/50"
          )} />
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generate(); } }}
            placeholder={`Describe what ${toolName || "this tool"} should and shouldn't do...`}
            disabled={status === "loading"}
            rows={2}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50 leading-relaxed min-h-[2.5rem]"
          />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <span className="text-[11px] text-muted-foreground/40">
            {status === "loading" ? "Generating with Mistral..." : "⌘ Return to generate"}
          </span>
          <button
            onClick={generate}
            disabled={!prompt.trim() || status === "loading"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              prompt.trim() && status !== "loading"
                ? "bg-brand text-brand-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            {status === "loading" ? (
              <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Generating</>
            ) : (
              <><span>Generate</span><ArrowRight className="w-3 h-3" /></>
            )}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {status === "idle" && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-0.5 mb-0.5">Try these</p>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="flex items-center gap-2.5 text-left text-xs text-muted-foreground px-3 py-2 rounded-lg hover:bg-surface-1 hover:text-foreground transition-colors group"
            >
              <span className="w-1 h-1 rounded-full bg-border group-hover:bg-brand flex-shrink-0 transition-colors" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-destructive/8 border border-destructive/20">
          <span className="text-xs text-destructive leading-relaxed flex-1">{errorMsg}</span>
          <button onClick={reset} className="flex-shrink-0 text-destructive/60 hover:text-destructive transition-colors mt-0.5">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Preview */}
      {status === "success" && preview && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Policy generated</span>
            </div>
            <button onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="w-3 h-3" />
              Regenerate
            </button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <pre className="bg-editor-bg text-[11px] font-mono text-emerald-400 p-4 overflow-auto max-h-52 leading-relaxed">
              {preview}
            </pre>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { onAccept(preview); reset(); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Apply policy
            </button>
            <button
              onClick={reset}
              className="px-3 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
