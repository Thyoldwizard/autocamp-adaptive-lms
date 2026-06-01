'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Clock,
  GraduationCap,
  MessageSquareText,
  RefreshCw,
  Target,
  BookOpenCheck,
  TrendingUp,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { EmptyState, PageSkeleton, StudentShell } from '@/components/AppShell';
import { Card, MetricCard, RiskBadge } from '@/components/ui';
import { EASE_OUT, CARD_V, CONTAINER_V } from '@/lib/constants';
import { useFetch } from '@/hooks/useFetch';

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

function getDynamicHeadline(firstName, pct, riskLevel) {
  if (riskLevel === 'high' || riskLevel === 'critical') {
    return `${firstName}, this week is the one that matters.`;
  }
  if (pct >= 70) return 'Strong momentum. The path is working.';
  if (pct >= 40) return `${pct}% to goal — the gap is closeable.`;
  return 'Your adaptive path is gathering signal.';
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

function SparkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-input border border-[#ded7cd] bg-white px-3 py-2 text-xs font-extrabold text-primary shadow-card">
      {label}: {payload[0].value}%
    </div>
  );
}

function ProgressSparkline({ data = [] }) {
  if (!data.length) return null;
  const id = 'spark-gradient';
  return (
    <motion.div variants={CARD_V}>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-extrabold uppercase text-primary">Goal progress over time</p>
          <TrendingUp size={22} className="text-accent" />
        </div>
        <div className="mt-4" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2D6A4F" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 700, fill: '#9b8f83' }} axisLine={false} tickLine={false} />
              <Tooltip content={<SparkTooltip />} />
              <Area
                type="monotone"
                dataKey="pct"
                stroke="#2D6A4F"
                strokeWidth={2.5}
                fill={`url(#${id})`}
                dot={false}
                activeDot={{ r: 4, fill: '#2D6A4F', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload: load } = useFetch('/student/dashboard', 'Could not load dashboard');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const { learner, journey, skills, atRisk, goalProgress, recentActivity, progressHistory } = data;
  const firstName = (learner?.name ?? learner?.email ?? 'Learner').split(' ')[0];
  const pct = goalProgress?.percentage ?? 0;
  const riskLevel = typeof atRisk === 'string' ? atRisk : atRisk?.level ?? 'low';
  const action = journey?.nextBestAction ?? {};
  const summary = journey?.progressSummary ?? {};
  const days = daysSince(learner?.enrolledAt ?? learner?.created_at ?? learner?.createdAt);

  return (
    <Shell>
      <motion.div variants={CONTAINER_V} initial="hidden" animate="show">
        <section className="relative mt-10 grid gap-6 lg:grid-cols-[1fr_0.62fr] lg:items-stretch">
          <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-accent/12 blur-3xl" aria-hidden="true" />
          <motion.div variants={CARD_V}>
            <Card className="p-6 sm:p-8">
              <p className="mb-4 text-xs font-extrabold uppercase text-primary">
                {getGreeting()}, {firstName}
              </p>
              <h1 className="font-display text-5xl font-extrabold leading-[0.96] text-text sm:text-7xl">
                {getDynamicHeadline(firstName, pct, riskLevel)}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
                {learner?.program}
                {learner?.cohort ? ` · ${learner.cohort}` : ''}
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <RiskBadge level={riskLevel} />
                {days !== null && (
                  <span className="inline-flex items-center gap-2 rounded-badge bg-white px-3 py-1.5 text-xs font-extrabold text-muted shadow-card">
                    <Clock size={12} />
                    Day {days}
                  </span>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div
            variants={CARD_V}
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
          <MetricCard icon={BookOpenCheck} label="Completed"   value={summary.completed ?? 0}   copy="Modules already finished." />
          <MetricCard icon={BarChart3}     label="In progress" value={summary.inProgress ?? 0}  copy="Active or stalled modules." />
          <MetricCard icon={GraduationCap} label="Not started" value={summary.notStarted ?? 0}  copy="Still waiting in the path." />
        </section>

        {progressHistory?.length > 0 && <ProgressSparkline data={progressHistory} />}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <motion.div variants={CARD_V}>
            <Card className="p-6">
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
            </Card>
          </motion.div>

          <motion.div variants={CARD_V}>
            <Card className="p-6">
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
            </Card>
          </motion.div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div variants={CARD_V}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase text-primary">Skill snapshot</p>
                <Brain size={22} className="text-accent" />
              </div>
              <div className="mt-5 flex flex-col gap-5">
                <SkillPills title="Strong"      items={skills?.strong ?? []}                          type="strong" />
                <SkillPills title="Developing"  items={skills?.developing ?? skills?.weak ?? []}      type="developing" />
                <SkillPills title="Not started" items={skills?.notStarted ?? []}                      type="weak" />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={CARD_V}>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase text-primary">Recent activity</p>
                <Clock size={22} className="text-accent" />
              </div>
              <div className="mt-5 divide-y divide-[#ded7cd]">
                {(recentActivity ?? []).slice(0, 5).map((item, index) => {
                  const isBot = item.role === 'assistant';
                  return (
                    <div key={`${item.created_at ?? item.createdAt ?? index}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${isBot ? 'bg-primary text-white' : 'bg-accent/20 text-primary'}`}>
                        {isBot ? <Bot size={11} /> : <User size={11} />}
                      </div>
                      <p className="line-clamp-2 flex-1 text-sm font-medium leading-6 text-text">
                        {item.content ?? item.message ?? item.response ?? ''}
                      </p>
                      <span className="shrink-0 text-xs font-bold uppercase text-muted">
                        {formatTime(item.createdAt ?? item.created_at ?? item.timestamp)}
                      </span>
                    </div>
                  );
                })}
                {(recentActivity ?? []).length === 0 && (
                  <EmptyState
                    icon={Clock}
                    title="No activity yet."
                    copy="Your companion messages and learning events will appear here once you start working."
                  />
                )}
              </div>
            </Card>
          </motion.div>
        </section>
      </motion.div>
    </Shell>
  );
}
