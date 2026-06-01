'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Radar,
  Sparkles,
} from 'lucide-react';
import { post } from '@/lib/api';
import { saveToken, getUser } from '@/lib/auth';

const EASE_OUT = [0.16, 1, 0.3, 1];

const IMAGE_URL =
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2200&q=86';

const tickerItems = [
  'Adaptive learner model',
  'Cohort intelligence',
  'Early risk signals',
  'AI companion',
  'Instructor interventions',
  'Skills heatmaps',
];

const fieldCls = `
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
      staggerChildren: 0.08,
      delayChildren: 0.16,
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
      pa<span className="text-accent">ce</span>
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

function GlassMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-input border border-white/20 bg-white/10 p-4 text-white backdrop-blur-2xl">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-white/60">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
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
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(17,43,33,0.98)_0%,rgba(45,106,79,0.86)_48%,rgba(244,162,97,0.42)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" aria-hidden="true" />

      <div className="absolute left-0 right-0 top-0 z-10">
        <Ticker />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-12 py-14 xl:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="pace home">
            <BrandWordmark light />
          </Link>
          <div className="rounded-badge border border-white/30 bg-white/12 px-4 py-2 text-xs font-bold uppercase text-white backdrop-blur-2xl">
            Adaptive LMS
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.22 }}
          className="max-w-[660px]"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-badge border border-white/40 bg-white/20 px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_14px_42px_rgba(0,0,0,0.14)] backdrop-blur-2xl">
            <Sparkles size={14} />
            Secure cohort workspace
          </div>
          <h1 className="font-display text-[clamp(3.8rem,7.2vw,7.8rem)] font-extrabold leading-[0.88] text-white">
            Learn with signal.
          </h1>
          <p className="mt-7 max-w-[540px] text-lg leading-8 text-white/80">
            Return to adaptive modules, skill signals, and instructor visibility in one calm learning system.
          </p>
        </motion.div>

        <div className="grid max-w-[620px] gap-3">
          <div className="rounded-input border border-white/20 bg-white/10 p-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-white/60">Today&apos;s cohort signal</p>
                <p className="mt-1 font-display text-2xl font-extrabold">Data Analytics Bootcamp</p>
              </div>
              <Radar size={24} className="text-accent" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <GlassMetric icon={GraduationCap} label="Cohorts" value="03" />
              <GlassMetric icon={BarChart3} label="Progress" value="68%" />
              <GlassMetric icon={BookOpenCheck} label="Modules" value="22" />
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setSessionExpired(new URLSearchParams(window.location.search).get('reason') === 'session-expired');
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await post('/auth/login', { email, password });

      saveToken(data.access_token);

      const user = getUser();
      const role = user?.app_metadata?.role;

      router.push(role === 'instructor' ? '/instructor/cohort' : '/student/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[1.04fr_0.96fr]">
      <VisualPanel />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,106,79,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" aria-hidden="true" />
        <div className="absolute right-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />

        <motion.div
          variants={formContainer}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-[500px]"
        >
          <motion.div variants={fieldGroup} className="mb-8 flex items-center justify-between">
            <Link href="/" aria-label="pace home">
              <BrandWordmark />
            </Link>
            <Link
              href="/register"
              className="rounded-badge border border-[#d8d0c4] bg-white/70 px-4 py-2 text-sm font-bold text-primary shadow-card backdrop-blur-xl transition-colors hover:bg-white"
            >
              Create account
            </Link>
          </motion.div>

          <motion.div
            variants={fieldGroup}
            className="rounded-input border border-[#ded7cd] bg-white/70 p-5 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl sm:p-7"
          >
            <div className="mb-8">
              <p className="mb-3 text-xs font-extrabold uppercase text-primary">
                Secure learning workspace
              </p>
              <h1 className="font-display text-[46px] font-extrabold leading-[0.98] text-text sm:text-[62px]">
                Welcome back.
              </h1>
              <p className="mt-5 max-w-[380px] text-sm leading-7 text-muted">
                Sign in to continue your adaptive learning journey.
              </p>
            </div>

            <motion.form
              variants={formContainer}
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
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
                  className={fieldCls}
                />
              </motion.div>

              <motion.div variants={fieldGroup} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-bold text-text">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-primary transition-colors duration-micro hover:text-[#255c43] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className={`${fieldCls} pr-12`}
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

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: EASE_OUT }}
                  className="rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}

              {sessionExpired && !error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: EASE_OUT }}
                  className="rounded-input border border-accent/30 bg-accent/15 px-4 py-3 text-sm text-[#8a5a22]"
                  role="status"
                >
                  Session expired, please sign in again.
                </motion.p>
              )}

              <motion.button
                variants={fieldGroup}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                type="submit"
                disabled={loading}
                className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-input bg-primary px-4 text-sm font-extrabold text-white transition-[background-color,opacity,box-shadow] duration-micro hover:bg-[#255c43] hover:shadow-[0_14px_34px_rgba(45,106,79,0.24)] active:bg-[#1e4d38] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-micro group-hover:translate-x-0.5"
                />
              </motion.button>
            </motion.form>

            <motion.p variants={fieldGroup} className="mt-8 text-sm text-muted">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-extrabold text-primary transition-colors duration-micro hover:text-[#255c43] hover:underline"
              >
                Create one
              </Link>
            </motion.p>
          </motion.div>

          <motion.div
            variants={fieldGroup}
            className="mt-6 grid gap-3 text-sm sm:grid-cols-3 lg:hidden"
          >
            {['Adaptive paths', 'Risk signals', 'Skill tracking'].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-input border border-[#ded7cd] bg-white/70 px-3 py-3 font-bold text-primary shadow-card backdrop-blur-xl"
              >
                <CheckCircle2 size={15} className="text-accent" />
                {item}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
