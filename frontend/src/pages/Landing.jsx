import { CheckCircle2, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { VoiceIntakeCard } from "../components/landing/VoiceIntakeCard";
import { useAuth } from "../store/auth";

const BENEFITS = [
  "Speak in Urdu, English, or Roman Urdu",
  "Agents plan, code, and test inside a sandbox",
  "Every version is saved and easy to roll back",
];

const STEPS = [
  {
    title: "Speak your brief",
    body: "Record up to 60 seconds. No forms, no technical jargon.",
  },
  {
    title: "Confirm the transcript",
    body: "Edit anything the microphone got wrong before generating.",
  },
  {
    title: "Agents build & verify",
    body: "TypeScript, lint, build, and Playwright checks must pass.",
  },
];

const EXAMPLES = [
  {
    title: "Leather shop",
    prompt:
      "A dark blue and gold storefront for my Lahore leather shop, with products and WhatsApp ordering.",
  },
  {
    title: "Bakery",
    prompt:
      "A warm bakery site with a menu, photos, and delivery details for Gulberg.",
  },
  {
    title: "Salon",
    prompt:
      "A clean salon page with prices, opening hours, and a WhatsApp booking button.",
  },
];

export function Landing() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();

  function handleBriefConfirmed() {
    navigate(user ? "/dashboard" : "/login", {
      replace: true,
      state: user ? undefined : { from: "/dashboard" },
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 text-slate-200">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-violet/20 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-brand-cyan/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link className="flex shrink-0 items-center gap-2.5" to="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
            <Mic className="h-5 w-5 text-white" />
          </span>
          <span className="hidden text-base font-semibold text-white sm:inline">
            Voice-to-Website AI
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link className="btn-primary w-auto px-4 text-sm" to="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="btn-link px-2 text-sm" to="/login">
                Sign in
              </Link>
              <Link className="btn-primary w-auto px-4 text-sm" to="/signup">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
        <section className="grid items-center gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-16">
          <div className="animate-fade-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
              <Sparkles className="h-3.5 w-3.5" /> Speak it. We build it.
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl xl:text-6xl">
              Describe your website.{" "}
              <span className="bg-brand-gradient bg-clip-text text-transparent">
                We build it while you watch.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Talk in Urdu, English, or Roman Urdu. Our agents ask a few questions, then plan, code,
              test, and preview your site inside a verified sandbox.
            </p>

            <ul className="mt-7 space-y-2.5">
              {BENEFITS.map((benefit) => (
                <li className="flex items-start gap-2.5 text-sm text-slate-300" key={benefit}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan"
                  />
                  {benefit}
                </li>
              ))}
            </ul>

            <p className="mt-6 inline-flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-brand-cyan" />
              No technical setup. No code to write.
            </p>
          </div>

          <div className="animate-fade-rise lg:pl-2">
            <VoiceIntakeCard onConfirm={handleBriefConfirmed} />
          </div>
        </section>

        <section className="border-t border-white/5 py-12">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            A deterministic pipeline keeps the process predictable: you confirm the brief, and the
            tools decide when a version is good enough to ship.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                key={step.title}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                  Step {index + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/5 py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">Try a brief like</h2>
              <p className="mt-2 text-sm text-slate-400">
                Say it out loud or type it. The agents take it from there.
              </p>
            </div>
            <Sparkles aria-hidden="true" className="hidden h-6 w-6 text-brand-cyan sm:block" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {EXAMPLES.map((example) => (
              <figure
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
                key={example.title}
              >
                <figcaption className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                  {example.title}
                </figcaption>
                <blockquote className="mt-2 text-sm leading-relaxed text-slate-300">
                  &ldquo;{example.prompt}&rdquo;
                </blockquote>
              </figure>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-5 py-6 text-center text-xs text-slate-500 sm:px-8">
        &copy; {new Date().getFullYear()} Voice-to-Website AI. Built for people who would rather
        talk than type.
      </footer>
    </div>
  );
}
