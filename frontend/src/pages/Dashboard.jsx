import { useState } from "react";
import { ArrowLeft, Mic, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { VoiceIntakeCard } from "../components/landing/VoiceIntakeCard";
import { useAuth } from "../store/auth";

export function Dashboard() {
  const user = useAuth((state) => state.user);
  const [brief, setBrief] = useState("");
  const displayName = user?.full_name || user?.email || "";

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
            HiveCode AI
          </span>
        </Link>
        <span className="truncate text-xs text-slate-400 sm:text-sm">
          Signed in as {user?.email}
        </span>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
        <section className="animate-fade-rise py-8 text-center sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
            <Sparkles className="h-3.5 w-3.5" /> Dashboard
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Welcome, {displayName}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Describe the website you want out loud or type it. Review the brief, then confirm it.
          </p>
        </section>

        {brief ? (
          <section
            aria-live="polite"
            className="animate-fade-rise rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-card backdrop-blur sm:p-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
              <Sparkles className="h-3.5 w-3.5" /> Brief captured
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-white">Your brief is ready</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              Demo mode: the build agents arrive in a later phase. Your brief is kept for this
              session.
            </p>
            <blockquote className="mt-5 rounded-2xl border border-white/10 bg-navy-900/60 p-4 text-sm leading-relaxed text-slate-200">
              {brief}
            </blockquote>
            <button
              className="btn-primary mt-5 w-auto px-5"
              onClick={() => setBrief("")}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" /> Start a new brief
            </button>
          </section>
        ) : (
          <VoiceIntakeCard onConfirm={setBrief} />
        )}
      </main>
    </div>
  );
}
