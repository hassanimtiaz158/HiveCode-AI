import React, { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Code2, Eye, FileCode, FileJson, Loader2 } from "lucide-react";

export function FileGenerationProgress({
  files = [],
  activePath = "",
  completedCount = 0,
  totalCount = 0,
  generatedFiles = {},
  isComplete = false,
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getFileIcon = (path) => {
    if (path.endsWith(".json")) {
      return <FileJson className="h-4 w-4 text-amber-400" />;
    }
    return <FileCode className="h-4 w-4 text-brand-cyan" />;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "content":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "page":
        return "bg-purple-500/10 text-purple-300 border-purple-500/20";
      case "component":
        return "bg-blue-500/10 text-blue-300 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-950/80 p-5 shadow-card backdrop-blur space-y-4 animate-fade-rise">
      {/* Header & Overall Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-cyan/20 text-brand-cyan">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isComplete ? "Sequential Code Generation Complete" : "Synthesizing Source Files..."}
            </h3>
            <p className="text-xs text-slate-400">
              Stack: <span className="font-mono text-slate-300">vite-react-tailwind</span> (TypeScript)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono font-medium text-brand-cyan">{completedCount}/{totalCount}</span>
            <span className="text-xs text-slate-400 ml-1">files ({percent}%)</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand-indigo to-brand-violet transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* File Tree List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {files.map((file, idx) => {
          const isFinished = idx < completedCount || isComplete;
          const isCurrent = file.path === activePath && !isFinished;
          const hasCode = !!generatedFiles[file.path];

          return (
            <div
              key={file.path}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-colors ${
                isCurrent
                  ? "border-brand-cyan/40 bg-brand-cyan/5 shadow-glow"
                  : isFinished
                  ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                  : "border-white/5 bg-white/[0.01] opacity-60"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {isFinished ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-cyan" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border border-white/20" />
                )}

                {getFileIcon(file.path)}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono font-medium text-slate-200">
                      {file.path}
                    </span>
                    <span className={`shrink-0 rounded border px-1.5 py-0.2 text-[10px] uppercase font-semibold ${getRoleBadge(file.role)}`}>
                      {file.role}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-400 mt-0.5">
                    {file.description}
                  </p>
                </div>
              </div>

              {hasCode && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(selectedFile === file.path ? null : file.path)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300 hover:text-white hover:bg-white/5 transition"
                >
                  <Code2 className="h-3 w-3" />
                  <span>{selectedFile === file.path ? "Hide" : "Inspect"}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Code Inspector Drawer */}
      {selectedFile && generatedFiles[selectedFile] && (
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950 p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-mono text-xs font-semibold text-emerald-400">{selectedFile}</span>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <pre className="max-h-60 overflow-x-auto overflow-y-auto text-[11px] font-mono text-slate-300 leading-relaxed bg-navy-950/60 p-3 rounded-lg border border-white/5">
            {generatedFiles[selectedFile]}
          </pre>
        </div>
      )}
    </div>
  );
}
