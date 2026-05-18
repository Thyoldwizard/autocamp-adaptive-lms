'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  Clock,
  GraduationCap,
  MessageSquareText,
  RefreshCw,
  Target,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { get } from '@/lib/api';
import { EmptyState, PageSkeleton, StudentShell } from '@/components/AppShell';

const EASE_OUT = [0.16, 1, 0.3, 1];

const RISK = {
  low: { label: 'Low risk', cls: 'bg-primary/10 text-primary' },
  medium: { label: 'Medium risk', cls: 'bg-accent/20 text-[#9b5f1e]' },
  high: { label: 'High risk', cls: 'bg-danger/10 text-danger' },
  critical: { label: 'Critical risk', cls: 'bg-red-100 text-red-700' },
};

const cardV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function Shell({ children }) {
  return <StudentShell>{children}</StudentShell>;
}

function LoadingState() {
  return <PageSkeleton />;
}

function ErrorState({ error, onRetry }) {
  return (
    <Shell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={38} className="text-danger" />
        <p className="max-w-sm text-sm leading-6 text-muted">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex h-11 items-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    </Shell>
  );
}

function GoalRing({ pct = 0 }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#F4A261"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-4xl font-extrabold text-white">{pct}%</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, copy }) {
  return (
    <motion.div
      variants={cardV}
      className="rounded-input border border-[#ded7cd] bg-white/72 p-5 shadow-[0_20px_70px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-muted">{label}</p>
          <p className="mt-2 font-display text-4xl font-extrabold text-text">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-input bg-primary/10 text-primary">
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
    </motion.div>
  );
}

function SkillPills({ title, items = [], type }) {
  const cls =
    type === 'strong'
      ? 'bg-primary/10 text-primary'
      : type === 'developing'
        ? 'bg-accent/20 text-[#9b5f1e]'
        : 'bg-danger/10 text-danger';

  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase text-muted">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.slice(0, 5).map((skill) => (
          <span key={skill.skillId ?? skill.code ?? skill.name} className={`rounded-badge px-3 py-1.5 text-xs font-extrabold ${cls}`}>
            {skill.name ?? skill.code}
          </span>
        ))}
        {items.length === 0 && <span className="text-sm text-muted">No skills here yet.</span>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');

    get('/student/dashboard')
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const { learner, journey, skills, atRisk, goalProgress, recentActivity } = data;
  const firstName = (learner?.name ?? learner?.email ?? 'Learner').split(' ')[0];
  const pct = goalProgress?.percentage ?? 0;
  const riskLevel = typeof atRisk === 'string' ? atRisk : atRisk?.level ?? 'low';
  const risk = RISK[riskLevel] ?? RISK.low;
  const action = journey?.nextBestAction ?? {};
  const summary = journey?.progressSummary ?? {};
  const days = daysSince(learner?.enrolledAt ?? learner?.created_at ?? learner?.createdAt);

  return (
    <Shell>
      <motion.div variants={container} initial="hidden" animate="show">
        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-stretch">
          <motion.div
            variants={cardV}
            className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl sm:p-8"
          >
            <p className="mb-4 text-xs font-extrabold uppercase text-primary">
              {getGreeting()}, {firstName}
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.96] text-text sm:text-7xl">
              Your adaptive path is live.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
              {learner?.program}
              {learner?.cohort ? ` · ${learner.cohort}` : ''}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className={`rounded-badge px-3 py-1.5 text-xs font-extrabold ${risk.cls}`}>
                {risk.label}
              </span>
              {days !== null && (
                <span className="inline-flex items-center gap-2 rounded-badge bg-white px-3 py-1.5 text-xs font-extrabold text-muted shadow-card">
                  <Clock size={12} />
                  Day {days}
                </span>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={cardV}
            className="flex flex-col justify-between rounded-input bg-primary p-6 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)] sm:p-8"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-white/70">Goal progress</p>
              <Target size={22} className="text-accent" />
            </div>
            <div className="mt-8 flex justify-center">
              <GoalRing pct={pct} />
            </div>
            <p className="mt-6 text-center text-sm font-bold text-white/80">
              {goalProgress?.onTrack ? 'You are on track.' : 'A focused push will help this week.'}
            </p>
          </motion.div>
        </section>

        <section id="progress" className="mt-6 grid scroll-mt-8 gap-4 rounded-input transition-shadow md:grid-cols-3">
          <MetricCard
            icon={BookOpenCheck}
            label="Completed"
            value={summary.completed ?? 0}
            copy="Modules already finished."
          />
          <MetricCard
            icon={BarChart3}
            label="In progress"
            value={summary.inProgress ?? 0}
            copy="Active or stalled modules."
          />
          <MetricCard
            icon={GraduationCap}
            label="Not started"
            value={summary.notStarted ?? 0}
            copy="Still waiting in the path."
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <motion.div
            variants={cardV}
            className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-primary">Up next</p>
                <h2 className="mt-2 font-display text-4xl font-extrabold leading-tight text-text">
                  {action.moduleName ?? action.moduleCode ?? journey?.currentModule?.moduleName ?? 'No module assigned yet'}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                  {action.reason ?? 'Your next module will appear here once the learner model has enough signal.'}
                </p>
              </div>
              <Link
                href="/student/skills"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white"
              >
                Skill map
                <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={cardV}
            className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-primary">Companion</p>
              <MessageSquareText size={22} className="text-accent" />
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              Ask for an explanation, a practice plan, or help with a weak area.
            </p>
            <Link
              href="/student/companion"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white"
            >
              Open companion
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            variants={cardV}
            className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-primary">Skill snapshot</p>
              <Brain size={22} className="text-accent" />
            </div>
            <div className="mt-5 flex flex-col gap-5">
              <SkillPills title="Strong" items={skills?.strong ?? []} type="strong" />
              <SkillPills title="Developing" items={skills?.developing ?? skills?.weak ?? []} type="developing" />
              <SkillPills title="Not started" items={skills?.notStarted ?? []} type="weak" />
            </div>
          </motion.div>

          <motion.div
            variants={cardV}
            className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-primary">Recent activity</p>
              <Clock size={22} className="text-accent" />
            </div>
            <div className="mt-5 divide-y divide-[#ded7cd]">
              {(recentActivity ?? []).slice(0, 5).map((item, index) => (
                <div key={`${item.created_at ?? item.createdAt ?? index}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <p className="line-clamp-1 text-sm font-medium text-text">
                    {item.content ?? item.message ?? item.response ?? ''}
                  </p>
                  <span className="shrink-0 text-xs font-bold uppercase text-muted">
                    {formatTime(item.createdAt ?? item.created_at ?? item.timestamp)}
                  </span>
                </div>
              ))}
              {(recentActivity ?? []).length === 0 && (
                <EmptyState
                  icon={Clock}
                  title="No activity yet."
                  copy="Your companion messages and learning events will appear here once you start working."
                />
              )}
            </div>
          </motion.div>
        </section>
      </motion.div>
    </Shell>
  );
}
