import { useState } from "react";
import { ArrowLeft, CheckCircle2, FileCode, Layers, Loader2, LogOut, Mic, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ClarifierQuestionCard } from "../components/chat/ClarifierQuestionCard";
import { VoiceIntakeCard } from "../components/landing/VoiceIntakeCard";
import {
  invokeProjectGraph,
  resumeProjectGraph,
  submitClarifyAnswers,
} from "../services/projectService";
import { useAuth } from "../store/auth";

export function Dashboard() {
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();

  const [brief, setBrief] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("clarifying");
  const [errorMessage, setErrorMessage] = useState("");

  // LangGraph Clarifier & Planner State
  const [questions, setQuestions] = useState([]);
  const [turn, setTurn] = useState(1);
  const [requirements, setRequirements] = useState(null);
  const [buildResult, setBuildResult] = useState(null);
  const [assistantAnswer, setAssistantAnswer] = useState("");

  const displayName = user?.full_name?.trim() || "User";
  const projectId = user?.id || "demo-project-id";

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleConfirmBrief(prompt) {
    setBrief(prompt);
    setIsLoading(true);
    setLoadingStage("clarifying");
    setErrorMessage("");
    setAssistantAnswer("");
    setQuestions([]);
    setRequirements(null);
    setBuildResult(null);

    try {
      const res = await invokeProjectGraph(projectId, prompt);
      const state = res.state || {};

      if (state.intent === "QUESTION") {
        const lastMsg = state.messages?.slice(-1)[0];
        setAssistantAnswer(lastMsg?.content || "Here is information regarding your query.");
      } else if (state.clarification_questions?.length > 0) {
        setQuestions(state.clarification_questions);
        setTurn(state.clarification_turn || 1);
      } else if (state.requirements) {
        setRequirements(state.requirements);
      }
    } catch (err) {
      setErrorMessage(err?.detail || err?.message || "Failed to start project workflow.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitAnswers(answers) {
    setIsLoading(true);
    setLoadingStage("clarifying");
    setErrorMessage("");
    try {
      const res = await submitClarifyAnswers(projectId, answers);
      const state = res.state || {};
      if (state.requirements) {
        setRequirements(state.requirements);
        setQuestions([]);
      } else if (state.clarification_questions?.length > 0) {
        setQuestions(state.clarification_questions);
        setTurn(state.clarification_turn || 2);
      }
    } catch (err) {
      setErrorMessage(err?.detail || err?.message || "Failed to submit answers.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApproveRequirements() {
    setIsLoading(true);
    setLoadingStage("architecting");
    setErrorMessage("");
    try {
      const res = await resumeProjectGraph(projectId, true);
      const state = res.state || {};
      setBuildResult({
        verified: state.verified,
        versionTag: state.version_tag || "v1",
        gitCommitSha: state.git_commit_sha || "main-commit",
        plan: state.plan,
      });
    } catch (err) {
      setErrorMessage(err?.detail || err?.message || "Failed to approve requirements.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setBrief("");
    setQuestions([]);
    setRequirements(null);
    setBuildResult(null);
    setAssistantAnswer("");
    setErrorMessage("");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 text-slate-200">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-violet/20 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-brand-blue/20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link className="flex shrink-0 items-center gap-2.5" to="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
            <Mic className="h-5 w-5 text-white" />
          </span>
          <span className="hidden text-base font-semibold text-white sm:inline">
            Voice-to-Website AI
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="max-w-[9rem] truncate text-xs text-slate-400 sm:max-w-xs sm:text-sm">
            <span className="hidden sm:inline">Signed in as </span>
            <span className="font-medium text-slate-200">{displayName}</span>
          </span>
          <button
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
        <section className="animate-fade-rise py-6 text-center sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
            <Sparkles className="h-3.5 w-3.5" /> Dashboard
          </span>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Welcome, {displayName}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Speak or type the website you want to build. Our AI will clarify your specifications before writing code.
          </p>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        {buildResult ? (
          <section className="animate-fade-rise rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-card backdrop-blur sm:p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">Blueprint Approved & Build Verified!</h2>
            <p className="mt-2 text-sm text-slate-400">
              Requirements version {buildResult.versionTag} confirmed. Git commit: <code className="text-emerald-300 font-mono text-xs">{buildResult.gitCommitSha}</code>.
            </p>

            {buildResult.plan?.files && (
              <div className="mt-6 text-left rounded-2xl border border-white/10 bg-navy-950/60 p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-brand-cyan" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Architectural Plan ({buildResult.plan.stack_profile || "vite-react-tailwind"})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{buildResult.plan.files.length} files planned</span>
                </div>
                <div className="space-y-2">
                  {buildResult.plan.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-mono font-medium text-emerald-400">{file.path}</span>
                        <p className="mt-0.5 text-slate-400">{file.description}</p>
                      </div>
                      <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-300">
                        {file.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
              onClick={handleReset}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" /> Build Another Website
            </button>
          </section>
        ) : brief ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-xs font-medium uppercase tracking-wider text-brand-cyan">Active Brief</span>
                <p className="mt-0.5 truncate text-sm font-medium text-white">"{brief}"</p>
              </div>
              <button
                onClick={handleReset}
                className="shrink-0 text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                type="button"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Start over
              </button>
            </section>

            {isLoading && (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 space-y-4">
                {loadingStage === "architecting" ? (
                  <div className="w-full max-w-md mx-auto space-y-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-brand-cyan">
                      <Layers className="h-5 w-5 animate-pulse" />
                      <span className="font-semibold text-white">Architecting site structure...</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-brand-cyan via-brand-indigo to-brand-violet animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-400">Synthesizing dependency-ordered file plan (vite-react-tailwind)...</p>
                  </div>
                ) : (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
                    <p className="text-sm">Orchestrating agents and generating requirements...</p>
                  </>
                )}
              </div>
            )}

            {assistantAnswer && !isLoading && (
              <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-5 text-sm text-slate-200">
                <span className="text-xs font-semibold uppercase text-brand-indigo">Answer</span>
                <p className="mt-2 text-base">{assistantAnswer}</p>
              </div>
            )}

            {(questions.length > 0 || requirements) && !isLoading && (
              <ClarifierQuestionCard
                questions={questions}
                turn={turn}
                onSubmitAnswers={handleSubmitAnswers}
                requirements={requirements}
                onApproveRequirements={handleApproveRequirements}
                isSubmitting={isLoading}
              />
            )}
          </div>
        ) : (
          <VoiceIntakeCard onConfirm={handleConfirmBrief} />
        )}
      </main>
    </div>
  );
}
