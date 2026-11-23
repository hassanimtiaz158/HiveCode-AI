import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileCode, Layers, Loader2, LogOut, Mic, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ClarifierQuestionCard } from "../components/chat/ClarifierQuestionCard";
import { FileGenerationProgress } from "../components/chat/FileGenerationProgress";
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

  // Phase 10 Sequential Coder Live Progress Tracking
  const [activeGeneratingPath, setActiveGeneratingPath] = useState("");
  const [completedFileCount, setCompletedFileCount] = useState(0);
  const [liveFiles, setLiveFiles] = useState([]);
  const [liveGeneratedFiles, setLiveGeneratedFiles] = useState({});
  const wsRef = useRef(null);

  const displayName = user?.full_name?.trim() || "User";
  const projectId = user?.id || "demo-project-id";

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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
    setActiveGeneratingPath("data/site.json");
    setCompletedFileCount(0);

    // Default expected file tree during generation
    setLiveFiles([
      { path: "data/site.json", role: "content", description: "Central copy and data repository" },
      { path: "src/components/Navbar.tsx", role: "component", description: "Responsive navigation header" },
      { path: "src/components/Hero.tsx", role: "component", description: "High-conversion hero section" },
      { path: "src/components/ProductCatalog.tsx", role: "component", description: "Interactive product and offerings grid" },
      { path: "src/components/Footer.tsx", role: "component", description: "Footer with contact and hours" },
      { path: "src/App.tsx", role: "page", description: "Root orchestrator component" },
    ]);

    // Connect WebSocket for live streaming events (Task 10.3)
    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.port === "5173" ? "localhost:8000" : window.location.host;
      const socket = new WebSocket(`${wsProtocol}//${wsHost}/api/v1/projects/${projectId}/graph/ws`);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "file_generation_started") {
            setActiveGeneratingPath(data.path);
          } else if (data.event === "file_generation_completed") {
            setCompletedFileCount((prev) => Math.max(prev + 1, data.index || 0));
          }
        } catch {
          // ignore parsing error
        }
      };
    } catch {
      // WebSocket optional fallback
    }

    try {
      const res = await resumeProjectGraph(projectId, true);
      const state = res.state || {};
      const generatedCodeFiles = state.files || state.generated_files || {};

      setBuildResult({
        verified: state.verified,
        versionTag: state.version_tag || "v1",
        gitCommitSha: state.git_commit_sha || "main-commit",
        plan: state.plan,
        files: generatedCodeFiles,
      });
      setCompletedFileCount(state.plan?.files?.length || 6);
    } catch (err) {
      setErrorMessage(err?.detail || err?.message || "Failed to approve requirements.");
    } finally {
      setIsLoading(false);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }

  function handleReset() {
    setBrief("");
    setQuestions([]);
    setRequirements(null);
    setBuildResult(null);
    setAssistantAnswer("");
    setErrorMessage("");
    setActiveGeneratingPath("");
    setCompletedFileCount(0);
    setLiveGeneratedFiles({});
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
            Speak or type the website you want to build. Our AI will clarify your specifications before generating your source code.
          </p>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}

        {buildResult ? (
          <section className="animate-fade-rise rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-card backdrop-blur sm:p-8 text-center space-y-6">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">Source Code Generated & Verified!</h2>
              <p className="mt-2 text-sm text-slate-400">
                Requirements version {buildResult.versionTag} confirmed. Git commit: <code className="text-emerald-300 font-mono text-xs">{buildResult.gitCommitSha}</code>.
              </p>
            </div>

            {buildResult.plan?.files && (
              <div className="text-left">
                <FileGenerationProgress
                  files={buildResult.plan.files}
                  completedCount={buildResult.plan.files.length}
                  totalCount={buildResult.plan.files.length}
                  generatedFiles={buildResult.files || {}}
                  isComplete={true}
                />
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
              <div className="p-6">
                {loadingStage === "architecting" ? (
                  <FileGenerationProgress
                    files={liveFiles}
                    activePath={activeGeneratingPath}
                    completedCount={completedFileCount}
                    totalCount={liveFiles.length}
                    generatedFiles={liveGeneratedFiles}
                    isComplete={false}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
                    <p className="text-sm">Orchestrating agents and generating requirements...</p>
                  </div>
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
