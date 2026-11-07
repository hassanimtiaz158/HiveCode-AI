import {
  Accessibility,
  AudioLines,
  BrainCircuit,
  Briefcase,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  Code2,
  Compass,
  Eye,
  HeartHandshake,
  Languages,
  LifeBuoy,
  ListChecks,
  Lock,
  Mail,
  Mic,
  Monitor,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
  UtensilsCrossed,
  Wand2,
  Workflow,
  X,
} from "lucide-react";

// Replace these with the deployment's real inboxes before launch.
const CONTACT_EMAIL = "hello@hivecode.ai";
const SUPPORT_EMAIL = "support@hivecode.ai";

const SECTION_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Tunnel", href: "#tunnel" },
  { label: "Awareness", href: "#awareness" },
  { label: "Guidelines", href: "#guidelines" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const PIPELINE_STEPS = [
  {
    icon: Mic,
    title: "Capture",
    body: "Record a voice note or type the brief in the language you think in.",
  },
  {
    icon: AudioLines,
    title: "Transcribe",
    body: "Speech becomes an editable transcript, with a confirmation step before anything is built.",
  },
  {
    icon: BrainCircuit,
    title: "Plan",
    body: "The planner chooses the pages, layout, content, and visual direction for your goal.",
  },
  {
    icon: Code2,
    title: "Generate",
    body: "The coder produces a component-based React and Tailwind site from the approved plan.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Build, type-check, lint, and smoke tests must pass before a version reaches you.",
  },
  {
    icon: Rocket,
    title: "Deliver",
    body: "Explore the live preview, request changes by voice or text, and publish when ready.",
  },
];

const USE_CASES = [
  {
    icon: ShoppingBag,
    title: "Online store",
    body: "Show products, categories, delivery details, and a clear path to checkout.",
  },
  {
    icon: Camera,
    title: "Portfolio",
    body: "Present your work, services, and contact details with a layout that lets the work lead.",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurant or café",
    body: "Publish your menu, opening hours, location, and reservation details.",
  },
  {
    icon: Briefcase,
    title: "Service business",
    body: "Explain what you do, answer common questions, and collect enquiries.",
  },
  {
    icon: CalendarDays,
    title: "Event or launch",
    body: "Ship a focused page with the schedule, speakers, and a signup call to action.",
  },
  {
    icon: HeartHandshake,
    title: "Community or NGO",
    body: "Share your mission, programmes, and the ways people can get involved.",
  },
];

const TUNNEL_STEPS = [
  {
    icon: Mic,
    title: "Describe",
    body: "Speak or type the website you want, in your own words.",
  },
  {
    icon: ListChecks,
    title: "Confirm",
    body: "Review the transcript and the structured brief before anything is built.",
    checkpoint: true,
  },
  {
    icon: Wand2,
    title: "Build",
    body: "The pipeline plans, generates, and verifies the site.",
  },
  {
    icon: Monitor,
    title: "Preview",
    body: "Explore the live result and request changes by voice or text.",
  },
  {
    icon: Rocket,
    title: "Publish",
    body: "Approve the version you want and take it live.",
    checkpoint: true,
  },
];

const AWARENESS_POINTS = [
  {
    icon: Languages,
    title: "Language inclusion",
    body: "Urdu, English, and Roman Urdu are treated as first-class ways to describe a website.",
  },
  {
    icon: Lock,
    title: "Privacy by default",
    body: "Audio stays in your browser in this build, and sessions use secure HttpOnly cookies.",
  },
  {
    icon: UserCheck,
    title: "Human checkpoints",
    body: "You confirm the brief before generation and approve the version before publishing.",
  },
  {
    icon: Accessibility,
    title: "Accessible output",
    body: "Generated pages aim for responsive layouts, readable contrast, and semantic structure.",
  },
];

const GUIDELINE_DOS = [
  "Name the goal, for example: a portfolio for my photography business.",
  "List the pages you need: home, gallery, about, and contact.",
  "Describe the look: dark theme, warm accents, and large photos.",
  "Add the must-haves: a WhatsApp button and a contact form.",
  "Use the language you think in: Urdu, English, or Roman Urdu.",
];

const GUIDELINE_AVOIDS = [
  "Vague briefs like “make it nice” without a concrete outcome.",
  "Asking for every feature at once; start with the core site.",
  "Sharing passwords or payment details in a voice note.",
  "Skipping the brief confirmation before generation.",
  "Expecting the preview to be final without requesting changes.",
];

const FAQS = [
  {
    question: "Do I need to know how to code?",
    answer:
      "No. Describe the website in your own words and review the brief. The pipeline handles planning, code generation, and verification.",
  },
  {
    question: "Which languages can I use?",
    answer:
      "Urdu, English, and Roman Urdu are supported. The transcript is editable, so you can correct names or details before confirming the brief.",
  },
  {
    question: "When is the website generated?",
    answer:
      "Only after you confirm the structured brief. Nothing is built from an unconfirmed transcript.",
  },
  {
    question: "Can I change the site after it is generated?",
    answer:
      "Yes. Ask for changes by voice or text. The system locates the affected files and produces a new version for you to review.",
  },
  {
    question: "How do I know a version is ready?",
    answer:
      "A version is shown only after the build, type-check, lint, and smoke-test gates pass.",
  },
  {
    question: "Is my voice recording stored?",
    answer:
      "In this build, audio stays in your browser and the transcript is simulated. Account and session handling is described on the Privacy page.",
  },
  {
    question: "How do I publish?",
    answer:
      "Review the live preview, approve the version you want, and publish it from the dashboard.",
  },
];

function SectionIntro({ icon: Icon, label, title, description }) {
  return (
    <div className="max-w-2xl">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-cyan">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </span>
      <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">{description}</p>
    </div>
  );
}

function StepCard({ icon: Icon, step, title, body, checkpoint = false }) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/25 to-brand-cyan/10 text-brand-cyan">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="flex items-center gap-2">
          {checkpoint ? (
            <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-cyan">
              You approve
            </span>
          ) : null}
          <span className="font-mono text-xs text-slate-600">
            {String(step).padStart(2, "0")}
          </span>
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

export function LandingSectionNav() {
  return (
    <nav
      aria-label="Landing sections"
      className="scroll-mt-24 border-t border-white/5 py-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Explore this page
        </p>
        <div className="flex flex-wrap gap-2">
          {SECTION_LINKS.map((link) => (
            <a
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function PipelineSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="pipeline">
      <SectionIntro
        description="Each stage has an explicit hand-off, so you always know what the system is doing and what it needs from you."
        icon={Workflow}
        label="Pipeline"
        title="A clear pipeline from brief to build."
      />

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PIPELINE_STEPS.map((step, index) => (
          <li className="h-full" key={step.title}>
            <StepCard {...step} step={index + 1} />
          </li>
        ))}
      </ol>

      <p className="mt-6 flex items-start gap-2.5 rounded-2xl border border-brand-cyan/20 bg-brand-cyan/[0.06] p-4 text-sm leading-relaxed text-slate-300">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
        A version is not marked complete on opinion alone. The build, type-check, lint, and
        smoke-test gates decide.
      </p>
    </section>
  );
}

export function UseCasesSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="use-cases">
      <SectionIntro
        description="Start with one clear goal. The same voice-first flow adapts to a store, a portfolio, a service page, or a launch."
        icon={Sparkles}
        label="Use cases"
        title="Built for the website you need next."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((useCase) => {
          const Icon = useCase.icon;

          return (
            <article
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-200 hover:border-white/20 hover:bg-white/[0.05]"
              key={useCase.title}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/25 to-brand-cyan/10 text-brand-cyan">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{useCase.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{useCase.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function TunnelSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="tunnel">
      <SectionIntro
        description="Follow one idea through the tunnel: describe it, confirm the brief, watch it build, and approve the version that goes live."
        icon={Compass}
        label="The build tunnel"
        title="From a spoken idea to a live URL."
      />

      <div className="relative mt-10">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent lg:block"
        />
        <ol className="relative grid gap-4 lg:grid-cols-5">
          {TUNNEL_STEPS.map((step, index) => (
            <li className="h-full" key={step.title}>
              <StepCard {...step} step={index + 1} />
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 rounded-2xl border border-white/10 bg-navy-900/60 p-5 text-sm leading-relaxed text-slate-300">
        <strong className="text-white">Two checkpoints stay in your hands:</strong> confirm the
        brief before generation, and approve the preview before publishing.
      </p>
    </section>
  );
}

export function AwarenessSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="awareness">
      <SectionIntro
        description="Speed should not come at the cost of inclusion, privacy, or control. These principles shape how the product behaves."
        icon={Eye}
        label="Built with awareness"
        title="Automation with human guardrails."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {AWARENESS_POINTS.map((point) => {
          const Icon = point.icon;

          return (
            <article
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-200 hover:border-white/20 hover:bg-white/[0.05]"
              key={point.title}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-brand-indigo/25 to-brand-cyan/10 text-brand-cyan">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{point.body}</p>
            </article>
          );
        })}
      </div>

      <p className="mt-6 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
        Awareness also means being clear about limits. The preview shows what was built, and
        verification runs before a version is marked ready.
      </p>
    </section>
  );
}

export function GuidelinesSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="guidelines">
      <SectionIntro
        description="You do not need technical vocabulary. A clear goal and a few concrete details give the pipeline what it needs."
        icon={ListChecks}
        label="User guidelines"
        title="A better brief, in one take."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <Check aria-hidden="true" className="h-5 w-5 text-emerald-300" /> Do this
          </h3>
          <ul className="mt-4 space-y-3">
            {GUIDELINE_DOS.map((item) => (
              <li className="flex gap-2.5 text-sm leading-relaxed text-slate-300" key={item}>
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <X aria-hidden="true" className="h-5 w-5 text-rose-300" /> Avoid this
          </h3>
          <ul className="mt-4 space-y-3">
            {GUIDELINE_AVOIDS.map((item) => (
              <li className="flex gap-2.5 text-sm leading-relaxed text-slate-300" key={item}>
                <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="mt-6 flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300">
        <Mic aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
        <span>
          <strong className="text-white">Voice tip:</strong> speak at a normal pace and pause when
          you finish. You can edit the transcript before the brief is confirmed.
        </span>
      </p>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="faq">
      <SectionIntro
        description="The short version of how the platform works. If your question is not here, use the contact section below."
        icon={CircleHelp}
        label="FAQ"
        title="Questions, answered."
      />

      <div className="mt-10 space-y-3">
        {FAQS.map((item) => (
          <details
            className="group rounded-2xl border border-white/10 bg-white/[0.03] transition open:border-white/20 open:bg-white/[0.05]"
            key={item.question}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 sm:text-base [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <ChevronDown
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="scroll-mt-24 border-t border-white/5 py-14 sm:py-20" id="contact">
      <SectionIntro
        description="Questions about the platform, a partnership, or a build that needs a human hand? Send a note and we will point you in the right direction."
        icon={Mail}
        label="Contact"
        title="Tell us what you want to build."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Mail aria-hidden="true" className="h-5 w-5 text-brand-cyan" />
          <h3 className="mt-4 text-base font-semibold text-white">General questions</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            Partnerships, feedback, and anything else.
          </p>
          <a
            className="mt-4 inline-flex break-all text-sm font-semibold text-brand-cyan transition hover:text-white"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <LifeBuoy aria-hidden="true" className="h-5 w-5 text-brand-cyan" />
          <h3 className="mt-4 text-base font-semibold text-white">Build support</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            Account and build support for active projects.
          </p>
          <a
            className="mt-4 inline-flex break-all text-sm font-semibold text-brand-cyan transition hover:text-white"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Clock aria-hidden="true" className="h-5 w-5 text-brand-cyan" />
          <h3 className="mt-4 text-base font-semibold text-white">Response time</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            We aim to reply within two business days.
          </p>
          <p className="mt-4 text-sm font-semibold text-white">Monday to Friday</p>
        </article>
      </div>
    </section>
  );
}
