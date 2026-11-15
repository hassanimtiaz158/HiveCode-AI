import React, { useState } from "react";
import { ArrowRight, CheckCircle2, HelpCircle, Layers, Palette, Send, Sparkles } from "lucide-react";

export function ClarifierQuestionCard({
  questions = [],
  turn = 1,
  onSubmitAnswers,
  requirements = null,
  onApproveRequirements,
  isSubmitting = false,
}) {
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSelectAllRecommended = () => {
    const autoAnswers = {};
    questions.forEach((q) => {
      const rec = q.options.find((opt) => opt.includes("You Decide") || opt.includes("Recommended"));
      autoAnswers[q.id] = rec || q.options[0];
    });
    setSelectedAnswers(autoAnswers);
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = questions.length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  // 1. If requirements have been synthesized, show the Confirmation Gate
  if (requirements) {
    const palette = requirements.palette || {};
    return (
      <div className="animate-fade-rise rounded-2xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-indigo/20 text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Requirements Specification</h3>
              <p className="text-xs text-slate-400">Review your generated project blueprint before build begins</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            Contract v{requirements.version_n || 1}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Business Profile</span>
            <p className="mt-1 text-base font-medium text-white">{requirements.business_name || "Online Store"}</p>
            <p className="text-xs text-slate-300 mt-0.5">{requirements.business_type || "Commercial Website"}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Palette className="h-3.5 w-3.5" />
              <span>Brand Color Palette</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              {palette.primary && (
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300">
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: palette.primary }} />
                  <span>Primary</span>
                </div>
              )}
              {palette.secondary && (
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300">
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: palette.secondary }} />
                  <span>Accent</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {requirements.hero_headline && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 my-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hero Section Preview</span>
            <p className="mt-1 text-sm font-semibold text-white">"{requirements.hero_headline}"</p>
            <p className="mt-0.5 text-xs text-slate-400">{requirements.hero_subheadline}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onApproveRequirements && onApproveRequirements(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            <span>Approve & Build Website</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Diagnostic Question Cards
  return (
    <div className="animate-fade-rise rounded-2xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Clarifying Interview</h3>
            <p className="text-xs text-slate-400">Turn {turn} of 3 • Answer {totalQuestions} quick questions to shape your design</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSelectAllRecommended}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <Sparkles className="h-3 w-3" />
          <span>Auto-select all "You Decide"</span>
        </button>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const currentAnswer = selectedAnswers[q.id];
          return (
            <div key={q.id || idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-300">
                  {idx + 1}
                </span>
                <p className="text-sm font-medium text-white">{q.question}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                {q.options?.map((option, optIdx) => {
                  const isSelected = currentAnswer === option;
                  const isYouDecide = option.includes("You Decide") || option.includes("Recommended");

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(q.id, option)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/15 text-white shadow-sm"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="pr-2">{option}</span>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-400" />
                      ) : isYouDecide ? (
                        <span className="shrink-0 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300 font-medium">
                          Auto
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-slate-400">
          {answeredCount} of {totalQuestions} answered
        </span>
        <button
          type="button"
          disabled={answeredCount === 0 || isSubmitting}
          onClick={() => onSubmitAnswers && onSubmitAnswers(selectedAnswers)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-40"
        >
          <span>Continue</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
