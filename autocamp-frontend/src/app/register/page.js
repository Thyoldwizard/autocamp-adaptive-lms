'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';
import { post } from '@/lib/api';
import { saveToken } from '@/lib/auth';

const EASE_OUT = [0.16, 1, 0.3, 1];

const IMAGE_URL =
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2200&q=86';

const BACKGROUND_TYPES = [
  { value: 'non_technical', label: 'Non-technical' },
  { value: 'semi_technical', label: 'Semi-technical' },
  { value: 'technical', label: 'Technical' },
];

const PROGRAMS = [
  { value: 'data-analytics-bootcamp', label: 'Data Analytics Bootcamp' },
  { value: 'ai-bootcamp', label: 'AI Bootcamp' },
  { value: 'automation-with-ai-bootcamp', label: 'Automation with AI Bootcamp' },
];

const tickerItems = [
  'Student onboarding',
  'Adaptive modules',
  'Skills heatmaps',
  'Cohort intelligence',
  'AI companion',
  'Risk signals',
];

const inputCls = `
  h-12 w-full rounded-input border border-[#d8d0c4] bg-white/90 px-4
  text-sm text-text placeholder:text-muted/60 outline-none
  transition-[border-color,box-shadow,background-color] duration-micro
  focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10
`;

const fieldGroup = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const formContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.14,
    },
  },
};

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

function Ticker() {
  const content = [...tickerItems, ...tickerItems];

  return (
    <div className="overflow-hidden border-y border-white/20 bg-black/20 backdrop-blur-xl" aria-hidden="true">
      <motion.div
        className="flex w-max gap-6 py-3 text-[11px] font-bold uppercase text-white/80"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      >
        {content.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-6 whitespace-nowrap">
            {item}
            <span className="h-1 w-1 rounded-full bg-accent" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function VisualPanel() {
  return (
    <motion.aside
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: EASE_OUT }}
      className="relative hidden min-h-screen overflow-hidden bg-primary lg:block"
    >
      <div
        className="absolute inset-0 scale-[1.03] bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGE_URL})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(17,43,33,0.98)_0%,rgba(45,106,79,0.84)_48%,rgba(244,162,97,0.44)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" aria-hidden="true" />

      <div className="absolute left-0 right-0 top-0 z-10">
        <Ticker />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-12 py-14 xl:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="atomcamp home">
            <BrandWordmark light />
          </Link>
          <div className="rounded-badge border border-white/30 bg-white/12 px-4 py-2 text-xs font-bold uppercase text-white backdrop-blur-2xl">
            New learner model
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.22 }}
          className="max-w-[700px]"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-badge border border-white/40 bg-white/20 px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_14px_42px_rgba(0,0,0,0.14)] backdrop-blur-2xl">
            <Sparkles size={14} />
            Start with context
          </div>
          <h1 className="font-display text-[clamp(3.8rem,7.2vw,7.8rem)] font-extrabold leading-[0.88] text-white">
            Build your learning signal.
          </h1>
          <p className="mt-7 max-w-[560px] text-lg leading-8 text-white/80">
            Create a profile that helps autocamp recommend modules, track skills, and support the right intervention moments.
          </p>
        </motion.div>

        <div className="rounded-input border border-white/20 bg-white/10 p-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
          <p className="text-[11px] font-bold uppercase text-white/60">Onboarding captures</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { icon: GraduationCap, label: 'Program' },
              { icon: Brain, label: 'Background' },
              { icon: BookOpenCheck, label: 'Goal' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-input border border-white/20 bg-white/12 p-4">
                <Icon size={19} className="text-accent" />
                <p className="mt-3 text-sm font-extrabold">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function SelectButton({ selected, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`rounded-input border text-left text-sm font-bold transition-all duration-micro ${
        selected
          ? 'border-primary bg-primary text-white shadow-[0_14px_34px_rgba(45,106,79,0.18)]'
          : 'border-[#d8d0c4] bg-white/80 text-text hover:border-primary/40 hover:bg-white'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [backgroundType, setBackgroundType] = useState('');
  const [program, setProgram] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLearner = role === 'student';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (isLearner && (!backgroundType || !program)) {
      setError('Please select your background and program.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        role,
        ...(isLearner && {
          background_type: backgroundType,
          program,
          stated_goal: goal,
        }),
      };

      const data = await post('/auth/register', payload);
      const token = data.access_token ?? data.session?.access_token;
      if (token) saveToken(token);

      router.push(role === 'instructor' ? '/instructor/cohort' : '/student/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.04fr_0.96fr]">
      <VisualPanel />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,106,79,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" aria-hidden="true" />
        <div className="absolute right-[-140px] top-[-120px] h-[340px] w-[340px] rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />

        <motion.div
          variants={formContainer}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-[560px]"
        >
          <motion.div variants={fieldGroup} className="mb-8 flex items-center justify-between">
            <Link href="/" aria-label="atomcamp home">
              <BrandWordmark />
            </Link>
            <Link
              href="/login"
              className="rounded-badge border border-[#d8d0c4] bg-white/70 px-4 py-2 text-sm font-bold text-primary shadow-card backdrop-blur-xl transition-colors hover:bg-white"
            >
              Sign in
            </Link>
          </motion.div>

          <motion.div
            variants={fieldGroup}
            className="rounded-input border border-[#ded7cd] bg-white/70 p-5 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl sm:p-7"
          >
            <div className="mb-8">
              <p className="mb-3 text-xs font-extrabold uppercase text-primary">
                Create your learner profile
              </p>
              <h1 className="font-display text-[42px] font-extrabold leading-[0.98] text-text sm:text-[58px]">
                Start adaptive.
              </h1>
              <p className="mt-5 max-w-[420px] text-sm leading-7 text-muted">
                Tell autocamp who you are, what you&apos;re learning, and where you want to go.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <motion.div variants={fieldGroup} className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-bold text-text">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Amna Malik"
                    className={inputCls}
                  />
                </motion.div>

                <motion.div variants={fieldGroup} className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-bold text-text">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </motion.div>
              </div>

              <motion.div variants={fieldGroup} className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-bold text-text">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={fieldGroup} className="flex flex-col gap-2">
                <span className="text-sm font-bold text-text">I am joining as</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'student', label: 'Learner', icon: GraduationCap },
                    { value: 'instructor', label: 'Instructor', icon: Users },
                  ].map(({ value, label, icon: Icon }) => (
                    <SelectButton
                      key={value}
                      selected={role === value}
                      onClick={() => setRole(value)}
                      className="p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={19} className={role === value ? 'text-white' : 'text-primary'} />
                        <span>{label}</span>
                      </div>
                    </SelectButton>
                  ))}
                </div>
              </motion.div>

              <AnimatePresence initial={false}>
                {isLearner && (
                  <motion.div
                    key="learner-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                    className="flex flex-col gap-5 overflow-hidden"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-text">Your background</span>
                      <div className="flex flex-wrap gap-2">
                        {BACKGROUND_TYPES.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setBackgroundType(value)}
                            className={`rounded-badge border px-3.5 py-2 text-sm font-bold transition-all duration-micro ${
                              backgroundType === value
                                ? 'border-primary bg-primary text-white'
                                : 'border-[#d8d0c4] bg-white/80 text-muted hover:border-primary/40 hover:bg-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-text">Your program</span>
                      <div className="grid gap-2">
                        {PROGRAMS.map(({ value, label }) => (
                          <SelectButton
                            key={value}
                            selected={program === value}
                            onClick={() => setProgram(value)}
                            className="px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span>{label}</span>
                              {program === value && <CheckCircle2 size={16} />}
                            </div>
                          </SelectButton>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="goal" className="text-sm font-bold text-text">
                        Learning goal <span className="font-medium text-muted">(optional)</span>
                      </label>
                      <input
                        id="goal"
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="Get a data analyst job in 6 months"
                        className={inputCls}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                variants={fieldGroup}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-input bg-primary px-4 text-sm font-extrabold text-white transition-[background-color,opacity,box-shadow] duration-micro hover:bg-[#255c43] hover:shadow-[0_14px_34px_rgba(45,106,79,0.24)] active:bg-[#1e4d38] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create account'}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-micro group-hover:translate-x-0.5"
                />
              </motion.button>
            </form>

            <p className="mt-7 text-sm text-muted">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-extrabold text-primary transition-colors duration-micro hover:text-[#255c43] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </motion.div>

          <motion.div variants={fieldGroup} className="mt-6 grid gap-3 text-sm sm:grid-cols-3 lg:hidden">
            {[
              { icon: GraduationCap, label: 'Program fit' },
              { icon: BarChart3, label: 'Progress signal' },
              { icon: BookOpenCheck, label: 'Next module' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-input border border-[#ded7cd] bg-white/70 px-3 py-3 font-bold text-primary shadow-card backdrop-blur-xl"
              >
                <Icon size={15} className="text-accent" />
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
