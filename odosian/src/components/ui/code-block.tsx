"use client";

import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
}

export function CodeBlock({
  code,
  language = "yaml",
  maxHeight = "400px",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl border border-border bg-bg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-light">
        <span className="text-xs text-text-muted font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-text-secondary hover:text-text transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        className="p-4 overflow-auto font-mono text-sm text-text"
        style={{ maxHeight }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
