import { ArrowRight, BadgeCheck, History, Mic, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicLayout } from "../components/site/PublicLayout";

const PRINCIPLES = [
  {
    icon: Mic,
    title: "Voice first",
    body: "Describe your site in Urdu, English, or Roman Urdu. A short recording is enough to get started.",
  },
  {
    icon: ShieldCheck,
    title: "Verified before shipped",
    body: "Every generated version is checked by tools, not opinions, before you see it in a preview.",
  },
  {
    icon: History,
    title: "Nothing gets lost",
    body: "Each version is saved, so you can compare changes and roll back whenever you need to.",
  },
];

export function About() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <section className="animate-fade-rise max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
            About
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-5xl">
            Built for people who would rather{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">talk than type.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
            Voice-to-Website AI turns a spoken description into a previewable website. Instead of
            learning a page builder, you explain what you need in your own words and review the
            brief before anything is generated.
          </p>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map((principle) => {
            const Icon = principle.icon;

            return (
              <article
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                key={principle.title}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/25 to-brand-cyan/10 text-brand-cyan">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-white">{principle.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{principle.body}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-navy-900/60 p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-semibold text-white">What the platform does</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
            <li className="flex gap-2.5">
              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
              Captures your brief by voice or text, then lets you correct the transcript.
            </li>
            <li className="flex gap-2.5">
              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
              Plans the pages, layout, colors, and content around your goal.
            </li>
            <li className="flex gap-2.5">
              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
              Builds and previews the site, then applies voice or text change requests.
            </li>
            <li className="flex gap-2.5">
              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
              Keeps a version history so you can publish with confidence.
            </li>
          </ul>
          <Link className="btn-primary mt-7 w-auto px-6" to="/signup">
            Start building free <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </PublicLayout>
  );
}
