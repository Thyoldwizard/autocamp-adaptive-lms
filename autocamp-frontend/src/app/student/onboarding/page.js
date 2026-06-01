'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Layers,
  Loader2,
  Sparkles,
  Target,
  Terminal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { get, post } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';
import { PageSkeleton, StudentShell } from '@/components/AppShell';
import { EASE_OUT } from '@/lib/constants';

const BACKGROUNDS = [
  {
    value: 'non_technical',
    label: 'Non-technical',
    icon: BookOpen,
    desc: 'No prior coding or data experience',
  },
  {
    value: 'semi_technical',
    label: 'Semi-technical',
    icon: Layers,
    desc: 'Some exposure to tools or analytics',
  },
  {
    value: 'technical',
    label: 'Technical',
    icon: Terminal,
    desc: 'Comfortable with code or data tools',
  },
];

const goals = [
  'Get job-ready in 6 months',
  'Build a portfolio project',
  'Automate work tasks',
  'Strengthen technical confidence',
];

function Shell({ children }) {
  return <StudentShell>{children}</StudentShell>;
}

function LoadingState() {
  return <PageSkeleton />;
}

function StepDots({ step }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((s) => (
        <motion.div
          key={s}
          className="h-2 rounded-badge"
          animate={{
            width: s === step ? 28 : 9,
            backgroundColor: s === step ? '#2D6A4F' : '#d8d0c4',
          }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [status, setStatus] = useState('loading');
  const [step, setStep] = useState(1);
  const [background, setBackground] = useState('');
  const [goal, setGoal] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);

    if (!getToken()) {
      router.replace('/login');
      return;
    }

    get('/student/onboarding/status')
      .then((data) => {
        if (data.completed) router.replace('/student/dashboard');
        else setStatus('show');
      })
      .catch(() => setStatus('show'));
  }, [router]);

  async function handleComplete() {
    setSubmitting(true);
    setError('');
    try {
      await post('/student/onboarding/complete', {
        answers: {
          background,
          goal: customGoal || goal,
        },
      });
      router.push('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (status === 'loading') return <LoadingState />;

  const displayName = user?.user_metadata?.name ?? user?.email ?? 'You';
  const backgroundLabel = BACKGROUNDS.find((item) => item.value === background)?.label;
  const chosenGoal = customGoal || goal || 'Not specified';

  return (
    <Shell>
      <section className="mt-10 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="flex flex-col justify-between rounded-input bg-primary p-6 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)] sm:p-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-badge border border-white/30 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase text-white backdrop-blur-2xl">
              <Sparkles size={14} className="text-accent" />
              Learner model setup
            </div>
            <h1 className="mt-8 font-display text-5xl font-extrabold leading-[0.96] sm:text-7xl">
              Tune the first signal.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/80">
              A little context helps pace recommend better modules and support moments from the start.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: BookOpen, label: 'Background' },
              { icon: Target, label: 'Goal' },
              { icon: BarChart3, label: 'Baseline' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-input border border-white/20 bg-white/10 p-4 backdrop-blur-2xl">
                <Icon size={19} className="text-accent" />
                <p className="mt-3 text-sm font-extrabold">{label}</p>
              </div>
            ))}
          </div>
        </motion.aside>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.08 }}
          className="rounded-input border border-[#ded7cd] bg-white/74 p-5 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl sm:p-7"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#ded7cd] pb-5">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-primary">
                Welcome, {displayName}
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold text-text">
                Student onboarding
              </h2>
            </div>
            <StepDots step={step} />
          </div>

          <div className="pt-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.42, ease: EASE_OUT }}
                >
                  <p className="text-[11px] font-extrabold uppercase text-primary">Step 1</p>
                  <h3 className="mt-2 font-display text-4xl font-extrabold text-text">
                    What is your starting point?
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    This calibrates how hard the first recommendations should push.
                  </p>

                  <div className="mt-6 grid gap-3">
                    {BACKGROUNDS.map(({ value, label, icon: Icon, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBackground(value)}
                        className={`flex items-center gap-4 rounded-input border p-4 text-left transition-colors ${
                          background === value
                            ? 'border-primary bg-primary text-white'
                            : 'border-[#d8d0c4] bg-white/80 text-text hover:border-primary/40'
                        }`}
                      >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-input ${background === value ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold">{label}</p>
                          <p className={`mt-1 text-xs ${background === value ? 'text-white/70' : 'text-muted'}`}>
                            {desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!background}
                    onClick={() => setStep(2)}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white transition-opacity disabled:opacity-50"
                  >
                    Continue
                    <ArrowRight size={15} />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.42, ease: EASE_OUT }}
                >
                  <p className="text-[11px] font-extrabold uppercase text-primary">Step 2</p>
                  <h3 className="mt-2 font-display text-4xl font-extrabold text-text">
                    What are you aiming for?
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    Pick a goal or write your own. Specific goals make recommendations sharper.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {goals.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setGoal(item);
                          setCustomGoal('');
                        }}
                        className={`rounded-input border px-4 py-3 text-left text-sm font-extrabold transition-colors ${
                          goal === item && !customGoal
                            ? 'border-primary bg-primary text-white'
                            : 'border-[#d8d0c4] bg-white/80 text-text hover:border-primary/40'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="Or write a more specific goal"
                    rows={4}
                    className="mt-4 w-full resize-none rounded-input border border-[#d8d0c4] bg-white/90 px-4 py-3 text-sm text-text outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-input border border-[#d8d0c4] bg-white/80 px-5 text-sm font-extrabold text-primary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!goal && !customGoal.trim()}
                      onClick={() => setStep(3)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white transition-opacity disabled:opacity-50"
                    >
                      Continue
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -32 }}
                  transition={{ duration: 0.42, ease: EASE_OUT }}
                >
                  <p className="text-[11px] font-extrabold uppercase text-primary">Step 3</p>
                  <h3 className="mt-2 font-display text-4xl font-extrabold text-text">
                    Confirm your signal.
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    This creates your baseline and sends you into the dashboard.
                  </p>

                  <div className="mt-6 grid gap-3">
                    {[
                      ['Name', displayName],
                      ['Background', backgroundLabel],
                      ['Goal', chosenGoal],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-input border border-[#ded7cd] bg-white/80 p-4">
                        <p className="text-[11px] font-extrabold uppercase text-muted">{label}</p>
                        <p className="mt-1 text-sm font-bold text-text">{value}</p>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p className="mt-4 rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                      {error}
                    </p>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-input border border-[#d8d0c4] bg-white/80 px-5 text-sm font-extrabold text-primary"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleComplete}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white transition-opacity disabled:opacity-50"
                    >
                      {submitting ? 'Setting up...' : 'Go to dashboard'}
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>
    </Shell>
  );
}
