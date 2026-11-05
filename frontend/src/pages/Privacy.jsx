import { Cookie, Database, Lock, Mic } from "lucide-react";
import { PublicLayout } from "../components/site/PublicLayout";

const TOPICS = [
  {
    icon: Mic,
    title: "Your recordings",
    body: "In the current demo, audio stays in your browser and the transcript is simulated. Audio is not uploaded by this build.",
  },
  {
    icon: Database,
    title: "Your account",
    body: "We use your name, email, and phone number to create and secure your account. We do not sell your details.",
  },
  {
    icon: Cookie,
    title: "Your session",
    body: "Sign-in sessions are held in secure, HttpOnly cookies that page scripts cannot read.",
  },
];

export function Privacy() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <section className="animate-fade-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
            Privacy
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-5xl">
            Privacy, without the fine-print maze.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
            We try to collect only what the product needs, explain where it goes, and keep your
            recordings under your control. Here is the short version.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {TOPICS.map((topic) => {
            const Icon = topic.icon;

            return (
              <article
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                key={topic.title}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/25 to-brand-cyan/10 text-brand-cyan">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-white">{topic.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{topic.body}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-10 space-y-6 rounded-3xl border border-white/10 bg-navy-900/60 p-6 shadow-card sm:p-8">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Lock aria-hidden="true" className="h-5 w-5 text-brand-cyan" /> What we store
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Account details you submit at signup, the briefs you confirm, and the versions you
              generate. Session data is limited to the cookie that keeps you signed in.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">What we do not do</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              We do not sell personal data, use your recordings to train public models, or share
              your briefs with other customers.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Your choices</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              You can edit or delete a brief before confirming it, and you can ask the team
              operating this deployment to remove your account data at any time.
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
