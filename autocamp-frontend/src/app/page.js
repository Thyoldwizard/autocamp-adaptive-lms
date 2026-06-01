'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Layers3,
  LineChart,
  MessageSquareText,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { setDemoMode } from '@/lib/demoMode';

const EASE_OUT = [0.16, 1, 0.3, 1];

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=2400&q=86';

const SECONDARY_IMAGE =
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1800&q=84';

const WORKSHOP_IMAGE =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=84';

const tickerItems = [
  'Adaptive learner model',
  'Cohort intelligence',
  'Early risk signals',
  'AI companion',
  'Instructor interventions',
  'Skills heatmaps',
];

const statCards = [
  { label: 'Demo cohorts', value: '03' },
  { label: 'Skills tracked', value: '12' },
  { label: 'Modules mapped', value: '22' },
  { label: 'Signal types', value: '06' },
];

const previewRows = [
  { name: 'Amna Malik', program: 'Data Analytics', skill: 'SQL joins', risk: 'Low', progress: 78 },
  { name: 'Bilal Ahmed', program: 'AI Bootcamp', skill: 'Model eval', risk: 'Medium', progress: 54 },
  { name: 'Sadia Hussain', program: 'Automation AI', skill: 'APIs', risk: 'High', progress: 41 },
];

const signalCards = [
  {
    icon: Brain,
    title: 'Learner model',
    copy: 'Background, goals, check-ins, modules, and skill confidence resolve into one adaptive profile.',
  },
  {
    icon: Radar,
    title: 'Risk sensing',
    copy: 'Missed deadlines, low confidence, inactivity, and help patterns surface before learners vanish.',
  },
  {
    icon: MessageSquareText,
    title: 'Companion memory',
    copy: 'Student support moments become context, so the next recommendation is not generic.',
  },
  {
    icon: Users,
    title: 'Instructor focus',
    copy: 'Cohorts become scannable by learner, module, risk level, and intervention priority.',
  },
];

const workflowSteps = [
  {
    icon: BookOpenCheck,
    title: 'Assess',
    copy: 'Onboarding captures program, background, goals, and confidence so every learner starts from a real baseline.',
  },
  {
    icon: Layers3,
    title: 'Adapt',
    copy: 'The system recommends modules and next actions from current progress, weak skills, and recent activity.',
  },
  {
    icon: LineChart,
    title: 'Interpret',
    copy: 'Cohort views translate scattered behavior into heatmaps, progress curves, and at-risk explanations.',
  },
  {
    icon: ShieldCheck,
    title: 'Intervene',
    copy: 'Instructors get a practical support queue, not a pile of dashboards asking them to guess.',
  },
];

const programs = ['AI Bootcamp', 'Data Analytics', 'Automation with AI', 'Applied GenAI'];

function BrandWordmark({ light = false }) {
  return (
    <span
      className={`font-display text-2xl font-extrabold leading-none ${
        light ? 'text-white' : 'text-primary'
      }`}
    >
      atom<span className="text-accent">camp</span>
    </span>
  );
}

function Ticker({ dark = false }) {
  const content = [...tickerItems, ...tickerItems];

  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden border-y backdrop-blur-xl ${
        dark ? 'border-[#ded7cd] bg-white/55' : 'border-white/20 bg-black/20'
      }`}
    >
      <motion.div
        className={`flex w-max gap-6 py-3 text-[11px] font-bold uppercase ${
          dark ? 'text-primary/75' : 'text-white/82'
        }`}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      >
        {content.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-6 whitespace-nowrap">
            {item}
            <span className={`h-1 w-1 rounded-full ${dark ? 'bg-accent' : 'bg-accent'}`} />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function Nav() {
  return (
    <header className="absolute left-0 right-0 top-0 z-30">
      <Ticker />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="atomcamp home">
          <BrandWordmark light />
        </Link>
        <div className="flex items-center gap-2 rounded-badge border border-white/20 bg-white/10 p-1 backdrop-blur-2xl">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-badge px-3 py-2 text-sm font-bold text-white/80 transition-colors hover:text-white sm:px-4"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="whitespace-nowrap rounded-badge bg-white px-4 py-2 text-sm font-extrabold text-primary shadow-[0_16px_40px_rgba(0,0,0,0.16)] transition-transform duration-micro hover:-translate-y-0.5"
          >
            Create account
          </Link>
        </div>
      </nav>
    </header>
  );
}

function DemoEntryButtons({ dark = false }) {
  const router = useRouter();

  function enter(role) {
    setDemoMode(role);
    router.push(role === 'instructor' ? '/instructor/cohort' : '/student/dashboard');
  }

  const labelCls = dark
    ? 'text-muted'
    : 'text-white/55';

  const studentCls = dark
    ? 'border border-[#ded7cd] bg-white/80 text-primary hover:bg-white'
    : 'border border-white/24 bg-white/12 text-white backdrop-blur-xl hover:bg-white/18';

  const instructorCls = dark
    ? 'border border-[#ded7cd] bg-white/80 text-primary hover:bg-white'
    : 'border border-white/24 bg-white/12 text-white backdrop-blur-xl hover:bg-white/18';

  return (
    <div className="flex flex-col gap-2">
      <p className={`text-[11px] font-bold uppercase ${labelCls}`}>
        Or explore the live demo — no account needed
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => enter('student')}
          className={`inline-flex h-[48px] items-center justify-center gap-2 rounded-badge px-6 text-sm font-extrabold transition-colors ${studentCls}`}
        >
          <GraduationCap size={16} />
          Explore as student
        </button>
        <button
          type="button"
          onClick={() => enter('instructor')}
          className={`inline-flex h-[48px] items-center justify-center gap-2 rounded-badge px-6 text-sm font-extrabold transition-colors ${instructorCls}`}
        >
          <Users size={16} />
          Explore as instructor
        </button>
      </div>
    </div>
  );
}

function GlassPanel({ children, className = '' }) {
  return (
    <div
      className={`border border-white/24 bg-white/14 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function HeroStat({ label, value, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE_OUT, delay }}
      className="border-l border-white/20 pl-4 text-white first:border-l-0 first:pl-0"
    >
      <div className="font-display text-3xl font-extrabold sm:text-4xl">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase text-white/65">{label}</div>
    </motion.div>
  );
}

function SignalMeter({ label, value, tone = 'primary' }) {
  const toneCls = tone === 'danger' ? 'bg-danger' : tone === 'accent' ? 'bg-accent' : 'bg-primary';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase text-white/72">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-badge bg-white/18">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.75 }}
          className={`h-full rounded-badge ${toneCls}`}
        />
      </div>
    </div>
  );
}

function HeroDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.28 }}
      className="relative"
    >
      <GlassPanel className="rounded-input p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-white/18 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase text-white/62">Cohort command</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-white">Instructor view</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-input bg-white/18 text-white">
            <BarChart3 size={21} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-input border border-white/16 bg-white/12 p-4">
            <p className="text-[11px] font-bold uppercase text-white/62">Goal progress</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-white">68%</p>
          </div>
          <div className="rounded-input border border-white/16 bg-white/12 p-4">
            <p className="text-[11px] font-bold uppercase text-white/62">At risk</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-accent">04</p>
          </div>
          <div className="rounded-input border border-white/16 bg-white/12 p-4">
            <p className="text-[11px] font-bold uppercase text-white/62">Check-ins</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-white">91%</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <SignalMeter label="SQL confidence" value={78} />
          <SignalMeter label="Module velocity" value={54} tone="accent" />
          <SignalMeter label="Support urgency" value={38} tone="danger" />
        </div>

        <div className="mt-5 overflow-hidden rounded-input border border-white/14">
          {previewRows.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/12 bg-white/10 px-4 py-3 last:border-b-0 sm:grid-cols-[1.1fr_0.9fr_0.7fr_auto]"
            >
              <div>
                <p className="text-sm font-bold text-white">{row.name}</p>
                <p className="mt-0.5 text-xs text-white/58 sm:hidden">{row.program}</p>
              </div>
              <p className="hidden text-sm text-white/70 sm:block">{row.program}</p>
              <p className="hidden text-sm text-white/70 sm:block">{row.skill}</p>
              <span
                className={`h-7 rounded-badge px-3 py-1 text-xs font-bold ${
                  row.risk === 'High'
                    ? 'bg-danger/20 text-[#ffd2cb]'
                    : row.risk === 'Medium'
                      ? 'bg-accent/18 text-[#ffe1be]'
                      : 'bg-white/14 text-white'
                }`}
              >
                {row.risk}
              </span>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="absolute -bottom-7 left-5 hidden max-w-[250px] rounded-input p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:block">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-input bg-accent text-text">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-white/62">Next best action</p>
            <p className="mt-1 text-sm font-bold">Pair Sadia with API practice</p>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-primary">
      <div
        className="absolute inset-0 scale-[1.03] bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(17,43,33,0.98)_0%,rgba(45,106,79,0.9)_46%,rgba(244,162,97,0.48)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" aria-hidden="true" />

      <Nav />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl gap-10 px-5 pb-14 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-[0.95fr_0.9fr] lg:items-center lg:px-10 lg:pb-16 lg:pt-32">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-badge border border-white/34 bg-white/18 px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_14px_42px_rgba(0,0,0,0.14)] backdrop-blur-2xl">
              <Sparkles size={14} />
              Adaptive LMS for cohort-based education
            </div>
            <h1 className="font-display text-6xl font-extrabold leading-[0.9] text-white sm:text-7xl lg:text-[104px]">
              atomcamp Adaptive LMS
            </h1>
            <p className="mt-7 max-w-[680px] text-lg leading-8 text-white/80 sm:text-xl sm:leading-9">
              A richer learner model for modern bootcamps, connecting student progress,
              instructor visibility, and timely support into one confident workspace.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, ease: EASE_OUT, delay: 0.34 }}
            className="mt-9 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-badge bg-white px-7 text-sm font-extrabold text-primary shadow-[0_20px_54px_rgba(0,0,0,0.22)] transition-transform duration-micro hover:-translate-y-0.5"
              >
                Start learning
                <ArrowRight
                  size={17}
                  className="transition-transform duration-micro group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-[52px] items-center justify-center rounded-badge border border-white/28 bg-white/10 px-7 text-sm font-extrabold text-white backdrop-blur-xl transition-colors duration-micro hover:bg-white/16"
              >
                Sign in
              </Link>
            </div>
            <DemoEntryButtons />
          </motion.div>

          <div className="mt-12 grid max-w-[760px] grid-cols-2 gap-5 sm:grid-cols-4">
            {statCards.map((stat, index) => (
              <HeroStat key={stat.label} {...stat} delay={0.5 + index * 0.08} />
            ))}
          </div>
        </div>

        <HeroDashboard />
      </div>
    </section>
  );
}

function EditorialIntro() {
  return (
    <section className="bg-background px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="mb-4 text-xs font-extrabold uppercase text-primary">Built around one learner model</p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-text sm:text-5xl lg:text-6xl">
            Students get direction. Instructors get the full signal.
          </h2>
        </div>
        <div className="lg:pl-8">
          <p className="max-w-[660px] text-base leading-8 text-muted sm:text-lg">
            autocamp turns onboarding, module movement, skill state, companion activity,
            and risk rules into one readable system, so support feels timely instead of reactive.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {programs.map((program) => (
              <div
                key={program}
                className="rounded-input border border-[#ded7cd] bg-white/70 px-4 py-3 text-sm font-bold text-primary shadow-card backdrop-blur-xl"
              >
                {program}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SignalCard({ icon: Icon, title, copy, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.58, ease: EASE_OUT, delay: index * 0.05 }}
      className="rounded-input border border-[#ded7cd] bg-white/76 p-6 shadow-[0_18px_60px_rgba(45,37,24,0.07)] backdrop-blur-xl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-input bg-primary/10 text-primary">
        <Icon size={22} />
      </div>
      <h3 className="mt-6 font-display text-2xl font-extrabold text-text">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted">{copy}</p>
    </motion.div>
  );
}

function ProductDepth() {
  return (
    <section className="relative overflow-hidden bg-[#efe9df] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(45,106,79,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <p className="mb-4 text-xs font-extrabold uppercase text-primary">The product layer</p>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-text sm:text-5xl">
              More than dashboards. A working model of the cohort.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted">
              The experience is intentionally split between student momentum and instructor
              clarity, but both sides read from the same underlying learning state.
            </p>
          </div>

          <div className="overflow-hidden rounded-input border border-white/60 bg-white/38 shadow-[0_26px_80px_rgba(45,37,24,0.12)] backdrop-blur-2xl">
            <div
              className="h-64 bg-cover bg-center"
              style={{ backgroundImage: `url(${SECONDARY_IMAGE})` }}
              aria-hidden="true"
            />
            <div className="grid grid-cols-3 divide-x divide-[#ded7cd]">
              <div className="p-4">
                <p className="font-display text-3xl font-extrabold text-primary">04</p>
                <p className="mt-1 text-xs font-bold uppercase text-muted">Risk tiers</p>
              </div>
              <div className="p-4">
                <p className="font-display text-3xl font-extrabold text-primary">12</p>
                <p className="mt-1 text-xs font-bold uppercase text-muted">Skills</p>
              </div>
              <div className="p-4">
                <p className="font-display text-3xl font-extrabold text-primary">22</p>
                <p className="mt-1 text-xs font-bold uppercase text-muted">Modules</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {signalCards.map((feature, index) => (
            <SignalCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowBand() {
  return (
    <section className="bg-primary px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-extrabold uppercase text-white/68">How it moves</p>
            <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              A calmer operating system for adaptive cohorts.
            </h2>
          </div>
          <p className="max-w-[620px] text-base leading-8 text-white/70 lg:ml-auto">
            Every screen should help someone decide what to do next: a learner choosing
            a module, an instructor checking risk, or a team reviewing cohort health.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-input border border-white/16 bg-white/16 md:grid-cols-4">
          {workflowSteps.map(({ icon: Icon, title, copy }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.56, ease: EASE_OUT, delay: index * 0.06 }}
              className="bg-primary/88 p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <Icon size={24} className="text-accent" />
                <span className="font-display text-sm font-extrabold text-white/36">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-8 font-display text-2xl font-extrabold">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/68">{copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseBand() {
  return (
    <section className="bg-background px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <div className="relative min-h-[470px] overflow-hidden rounded-input bg-primary sm:min-h-[520px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${WORKSHOP_IMAGE})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(15,40,29,0.86)_0%,rgba(15,40,29,0.16)_62%)]" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="rounded-input border border-white/24 bg-[#112b21]/52 p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-5">
              <p className="text-[11px] font-extrabold uppercase text-white/62">
                Demo-ready surfaces
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-0">
              {[
                ['Learners', 'guided next steps'],
                ['Instructors', 'risk-aware support'],
                ['Programs', 'cohort intelligence'],
              ].map(([title, copy]) => (
                <div
                  key={title}
                    className="border-white/18 sm:border-l sm:px-4 sm:first:border-l-0 sm:first:pl-0"
                >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent" />
                      <div>
                        <p className="text-sm font-extrabold">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-white/68">{copy}</p>
                      </div>
                    </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-4 text-xs font-extrabold uppercase text-primary">Demo-ready surfaces</p>
          <h2 className="font-display text-4xl font-extrabold leading-tight text-text sm:text-5xl">
            Built for the actual rhythm of a bootcamp.
          </h2>
          <p className="mt-5 text-base leading-8 text-muted">
            The public site should feel like the product inside it: composed, intelligent,
            and concrete enough that instructors can picture Monday morning.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: GraduationCap, title: 'Student onboarding and dashboard' },
              { icon: BarChart3, title: 'Instructor cohort intelligence' },
              { icon: Clock3, title: 'Early intervention timing' },
            ].map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-input border border-[#ded7cd] bg-white/74 p-4 shadow-card backdrop-blur-xl"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-input bg-primary/10 text-primary">
                  <Icon size={19} />
                </div>
                <p className="text-sm font-extrabold text-text">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-background px-5 pb-16 sm:px-8 lg:px-10">
      <div className="mx-auto overflow-hidden rounded-input border border-[#ded7cd] bg-white/72 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
        <Ticker dark />
        <div className="flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <BrandWordmark />
            <h2 className="mt-6 max-w-[680px] font-display text-3xl font-extrabold leading-tight text-text sm:text-5xl">
              Make every learner easier to support.
            </h2>
            <p className="mt-4 max-w-[560px] text-sm leading-7 text-muted sm:text-base">
              Sign in to continue your dashboard, or create an account to begin onboarding.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-badge border border-[#d8d0c4] px-6 text-sm font-extrabold text-primary transition-colors hover:bg-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-badge bg-primary px-6 text-sm font-extrabold text-white transition-colors hover:bg-[#255c43]"
              >
                Create account
                <ArrowRight
                  size={16}
                  className="transition-transform duration-micro group-hover:translate-x-0.5"
                />
              </Link>
            </div>
            <DemoEntryButtons dark />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <EditorialIntro />
      <ProductDepth />
      <WorkflowBand />
      <ShowcaseBand />
      <FinalCta />
    </main>
  );
}
