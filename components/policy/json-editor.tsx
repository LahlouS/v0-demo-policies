"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle, AlertCircle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-editor-bg">
      <div className="flex items-center gap-2 text-muted-foreground/40">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        <span className="text-xs font-mono">Loading editor...</span>
      </div>
    </div>
  ),
});

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const POLICY_SCHEMA = {
  type: "object",
  properties: {
    version: { type: "string", enum: ["1.0"] },
    tool: { type: "string" },
    rules: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          operator: {
            type: "string",
            enum: ["equals","not_equals","contains","not_contains","starts_with","ends_with","regex","in","not_in","gt","lt","gte","lte","between"],
          },
          value: {},
          effect: { type: "string", enum: ["allow", "deny"] },
        },
        required: ["field", "operator", "value", "effect"],
      },
    },
    default_effect: { type: "string", enum: ["allow", "deny"] },
  },
  required: ["version", "tool", "rules"],
};

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const [isValid, setIsValid] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  function validate(raw: string) {
    try {
      JSON.parse(raw);
      setIsValid(true);
      setErrorMsg("");
    } catch (e) {
      setIsValid(false);
      setErrorMsg((e as Error).message);
    }
  }

  useEffect(() => { validate(value); }, [value]);

  function handleEditorDidMount(editor: unknown, monaco: unknown) {
    const m = monaco as {
      languages: { json: { jsonDefaults: { setDiagnosticsOptions: (o: unknown) => void } } };
    };
    m.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{ uri: "https://hodor.ai/policy-schema.json", fileMatch: ["*"], schema: POLICY_SCHEMA }],
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-editor-bg border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-white/40 font-mono">valid JSON</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400 font-mono truncate max-w-xs">{errorMsg}</span>
            </>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors",
            copied ? "text-emerald-400" : "text-white/30 hover:text-white/60 hover:bg-white/5"
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="json"
          theme="vs-dark"
          value={value}
          onChange={(v) => { const nv = v ?? ""; onChange(nv); validate(nv); }}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 12,
            fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineHeight: 21,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            wordWrap: "on",
            tabSize: 2,
            padding: { top: 14, bottom: 14 },
            bracketPairColorization: { enabled: true },
            quickSuggestions: { other: true, comments: false, strings: true },
            suggest: { showKeywords: true, showSnippets: true },
            scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
