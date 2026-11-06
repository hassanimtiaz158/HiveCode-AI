import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicLayout } from "../components/site/PublicLayout";

const INCLUDED = [
  "Voice and text briefs",
  "AI-planned pages and layouts",
  "Live preview of every build",
  "Version history and rollback",
  "Clear, editable transcripts",
];

export function Pricing() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <section className="animate-fade-rise mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
            Pricing
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-5xl">
            Simple pricing.{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">Start free.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Create an account and build your first site at no cost. Paid build capacity and team
            plans arrive as the platform leaves beta.
          </p>
        </section>

        <section className="mx-auto mt-12 max-w-lg">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-navy-900/70 p-7 shadow-card sm:p-9">
            <div
              aria-hidden="true"
              className="absolute -top-20 right-0 h-48 w-48 rounded-full bg-brand-violet/25 blur-3xl"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
                <Sparkles className="h-3.5 w-3.5" /> Free while in beta
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-white">Starter</h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Everything you need to turn your first idea into a preview.
              </p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-sm text-slate-400">to get started</span>
              </p>

              <ul className="mt-6 space-y-3">
                {INCLUDED.map((feature) => (
                  <li className="flex items-start gap-2.5 text-sm text-slate-300" key={feature}>
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link className="btn-primary mt-8" to="/signup">
                Create your free account <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">No credit card required.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-slate-400">
          Need a plan for a team or a high-volume build pipeline? Paid tiers are being finalised,
          and your account dashboard will show them as soon as they are available.
        </section>
      </div>
    </PublicLayout>
  );
}
