import {
  ArrowRight,
  CheckCircle2,
  Code2,
  FileText,
  LayoutTemplate,
  Mic,
  Play,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { VoiceIntakeCard } from "../components/landing/VoiceIntakeCard";
import { PublicLayout } from "../components/site/PublicLayout";
import { useAuth } from "../store/auth";

const TRUST_POINTS = ["No credit card required", "Voice or text", "Urdu, English, or Roman Urdu"];

const STEPS = [
  {
    icon: Mic,
    title: "Speak your idea",
    body: "Tap the mic and describe your website in your own words.",
  },
  {
    icon: FileText,
    title: "We transcribe it",
    body: "Your voice is converted to text so you can review or edit it.",
  },
  {
    icon: Sparkles,
    title: "AI plans the site",
    body: "Our AI picks the pages, layout, colors, and content for your goal.",
  },
  {
    icon: Code2,
    title: "Website is generated",
    body: "Code and design are built automatically and shown in a live preview.",
  },
  {
    icon: Rocket,
    title: "Tweak and publish",
    body: "Ask for changes by voice, then publish with one click.",
  },
];

const SECONDARY_BUTTON =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]";

export function Landing() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const startPath = user ? "/dashboard" : "/signup";

  function handleBriefConfirmed() {
    navigate(user ? "/dashboard" : "/login", {
      replace: true,
      state: user ? undefined : { from: "/dashboard" },
    });
  }

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <section className="grid items-start gap-10 py-12 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:py-20">
          <div className="animate-fade-rise lg:pt-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
              <Wand2 className="h-3.5 w-3.5" /> Speak it. We build it.
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl xl:text-[3.75rem]">
              Speak your idea.{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                Get a live website.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Describe the site you want out loud. Our AI listens, designs, and builds it in
              minutes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link className="btn-primary w-auto px-6" to={startPath}>
                Start building free <ArrowRight className="h-4 w-4" />
              </Link>
              <a className={SECONDARY_BUTTON} href="#how">
                <Play className="h-4 w-4" /> See how it works
              </a>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              {TRUST_POINTS.map((point) => (
                <li className="inline-flex items-center gap-1.5" key={point}>
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-cyan" />
                  {point}
                </li>
              ))}
            </ul>

            <figure className="mt-9 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <figcaption className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                Try saying
              </figcaption>
              <blockquote className="mt-2 text-sm leading-relaxed text-slate-300">
                &ldquo;A portfolio site for a photographer, dark theme, with a gallery and contact
                form.&rdquo;
              </blockquote>
            </figure>
          </div>

          <div className="animate-fade-rise lg:pl-2">
            <VoiceIntakeCard onConfirm={handleBriefConfirmed} />
          </div>
        </section>

        <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="how">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
              <LayoutTemplate className="h-3.5 w-3.5" /> How it works
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
              From voice to website in five simple steps.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
              You describe the goal, confirm the brief, and the tools handle planning, generation,
              and preview.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <li className="h-full" key={step.title}>
                  <div className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/25 to-brand-cyan/10 text-brand-cyan">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-xs text-slate-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="border-t border-white/5 py-14 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-navy-900/60 p-8 text-center shadow-card sm:p-12">
            <div aria-hidden="true" className="absolute inset-0 bg-brand-gradient opacity-[0.1]" />
            <div
              aria-hidden="true"
              className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-violet/30 blur-3xl"
            />

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
                <Sparkles className="h-3.5 w-3.5" /> Ready when you are
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Ready to build with your voice?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Create a free account, record your first brief, and watch your idea turn into a
                live preview.
              </p>
              <Link className="btn-primary mx-auto mt-7 w-auto px-6" to={startPath}>
                {user ? "Go to your dashboard" : "Create your free account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
