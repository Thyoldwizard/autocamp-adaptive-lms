'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BarChart3,
  Flame,
  LineChart,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { get, post } from '@/lib/api';
import { EmptyState, InstructorShell, PageSkeleton } from '@/components/AppShell';

const EASE_OUT = [0.16, 1, 0.3, 1];

const RISK = {
  low: { label: 'Low', cls: 'bg-primary/10 text-primary' },
  medium: { label: 'Medium', cls: 'bg-accent/20 text-[#9b5f1e]' },
  high: { label: 'High', cls: 'bg-danger/10 text-danger' },
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700' },
};

const cardV = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

function pct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value));
}

function riskMeta(level) {
  return RISK[level] ?? RISK.low;
}

function cohortName(cohort) {
  return String(cohort || '').replaceAll('-', ' ');
}

function flattenCohorts(payload) {
  return payload?.cohorts ?? [];
}

function Shell({ children }) {
  return <InstructorShell>{children}</InstructorShell>;
}

function LoadingState() {
  return <PageSkeleton shell="instructor" />;
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

function MetricCard({ icon: Icon, label, value, detail }) {
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
      {detail && <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>}
    </motion.div>
  );
}

function HeatBar({ skill }) {
  const avg = pct((skill.averageProficiency ?? 0) * 100);
  return (
    <div className="rounded-input border border-[#ded7cd] bg-white/72 p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-text">{skill.skillName || skill.skillCode}</p>
          <p className="mt-1 text-xs font-bold uppercase text-muted">
            {skill.learnersStruggling} struggling · {skill.learnersStrong} strong
          </p>
        </div>
        <span className="font-display text-2xl font-extrabold text-primary">{avg}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-badge bg-[#e5ded4]">
        <div className="h-full rounded-badge bg-primary" style={{ width: `${avg}%` }} />
      </div>
    </div>
  );
}

function LearnerRow({ learner, onFlag, flagging }) {
  const level = learner.atRisk?.level ?? 'low';
  const risk = riskMeta(level);
  const progress = pct(learner.goalProgress?.percentage);
  const action = learner.nextBestAction ?? {};

  return (
    <div className="grid gap-4 border-b border-[#ded7cd] px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_0.65fr_1.1fr_auto] lg:items-center">
      <div>
        <Link
          href={`/instructor/learner/${learner.learnerId}`}
          className="font-display text-xl font-extrabold text-text transition-colors hover:text-primary"
        >
          {learner.name}
        </Link>
        <p className="mt-1 text-xs font-bold uppercase text-muted">{learner.learnerId}</p>
      </div>
      <div>
        <span className={`rounded-badge px-3 py-1.5 text-xs font-extrabold ${risk.cls}`}>
          {risk.label} risk
        </span>
        <p className="mt-2 text-sm font-bold text-primary">{progress}% goal progress</p>
      </div>
      <div>
        <p className="text-sm font-extrabold text-text">
          {action.moduleName ?? action.moduleCode ?? 'No recommended module'}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
          {action.reason ?? learner.atRisk?.reasons?.[0] ?? 'No immediate intervention required.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onFlag(learner)}
        disabled={flagging === learner.learnerId}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-input border border-[#d8d0c4] bg-white/80 px-4 text-sm font-extrabold text-primary transition-colors hover:bg-white disabled:opacity-60"
      >
        {flagging === learner.learnerId ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
        Flag
      </button>
    </div>
  );
}

export default function InstructorCohortPage() {
  const [overview, setOverview] = useState(null);
  const [atRisk, setAtRisk] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flagging, setFlagging] = useState('');
  const [flagTarget, setFlagTarget] = useState(null);
  const [flagNote, setFlagNote] = useState('');

  function load() {
    setLoading(true);
    setError('');

    Promise.all([
      get('/instructor/cohort'),
      get('/instructor/cohort/at-risk'),
      get('/instructor/cohort/heatmap'),
    ])
      .then(([overviewData, riskData, heatmapData]) => {
        setOverview(overviewData);
        setAtRisk(riskData);
        setHeatmap(heatmapData);
        const first = overviewData?.cohorts?.[0]?.cohort ?? '';
        setSelectedCohort((current) => current || first);
      })
      .catch((err) => setError(err.message || 'Could not load instructor dashboard'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleFlag(learner) {
    setFlagTarget(learner);
    setFlagNote('');
  }

  async function submitFlag() {
    if (!flagTarget || !flagNote.trim()) return;
    const learner = flagTarget;
    setFlagging(learner.learnerId);
    try {
      await post(`/instructor/learner/${learner.learnerId}/flag`, {
        note: flagNote.trim(),
      });
      setFlagTarget(null);
      setFlagNote('');
      load();
    } catch (err) {
      setError(err.message || 'Could not flag learner');
    } finally {
      setFlagging('');
    }
  }

  const cohorts = flattenCohorts(overview);
  const active = cohorts.find((c) => c.cohort === selectedCohort) ?? cohorts[0];
  const activeRisk = flattenCohorts(atRisk).find((c) => c.cohort === active?.cohort);
  const activeHeatmap = flattenCohorts(heatmap).find((c) => c.cohort === active?.cohort);
  const allLearners = useMemo(() => active?.learners ?? [], [active]);

  const filteredLearners = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allLearners;
    return allLearners.filter((learner) => {
      const text = `${learner.name} ${learner.atRisk?.level ?? ''} ${learner.nextBestAction?.moduleName ?? ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [allLearners, query]);

  const totals = useMemo(() => {
    const totalLearners = cohorts.reduce((sum, c) => sum + (c.totalLearners ?? 0), 0);
    const actionCount = flattenCohorts(atRisk).reduce((sum, c) => sum + (c.totalLearners ?? 0), 0);
    const avg =
      cohorts.length === 0
        ? 0
        : Math.round(cohorts.reduce((sum, c) => sum + (c.averageGoalProgress ?? 0), 0) / cohorts.length);
    return { totalLearners, actionCount, avg };
  }, [cohorts, atRisk]);

  if (loading) return <LoadingState />;
  if (error && !overview) return <ErrorState error={error} onRetry={load} />;

  return (
    <Shell>
      <motion.div variants={container} initial="hidden" animate="show">
        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-end">
          <motion.div variants={cardV}>
            <p className="mb-4 text-xs font-extrabold uppercase text-primary">Cohort intelligence</p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.96] text-text sm:text-7xl">
              Instructor command center.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
              Scan cohort health, identify learners who need intervention, and see the weakest
              skills before they become program-wide friction.
            </p>
          </motion.div>

          <motion.div
            variants={cardV}
            className="rounded-input border border-[#ded7cd] bg-primary p-5 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-white/70">Active cohort</p>
              <Radar size={20} className="text-accent" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {cohorts.map((cohort) => (
                <button
                  key={cohort.cohort}
                  onClick={() => setSelectedCohort(cohort.cohort)}
                  className={`rounded-badge px-4 py-2 text-sm font-extrabold transition-colors ${
                    active?.cohort === cohort.cohort
                      ? 'bg-white text-primary'
                      : 'border border-white/30 bg-white/10 text-white'
                  }`}
                >
                  {cohortName(cohort.cohort)}
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        {error && (
          <div className="mt-6 rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard icon={Users} label="Learners" value={totals.totalLearners} detail="Across authorized cohorts." />
          <MetricCard icon={Flame} label="Needs attention" value={totals.actionCount} detail="Medium, high, or critical risk." />
          <MetricCard icon={LineChart} label="Avg. progress" value={`${totals.avg}%`} detail="Mean goal progress across cohorts." />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
          <motion.div
            variants={cardV}
            className="overflow-hidden rounded-input border border-[#ded7cd] bg-white/72 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-4 border-b border-[#ded7cd] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-primary">Learner support queue</p>
                <h2 className="mt-1 font-display text-3xl font-extrabold text-text">
                  {cohortName(active?.cohort)}
                </h2>
              </div>
              <label className="flex h-11 items-center gap-2 rounded-input border border-[#d8d0c4] bg-white/80 px-3 text-sm text-muted">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search learners"
                  className="h-full bg-transparent font-medium outline-none placeholder:text-muted/70"
                />
              </label>
            </div>
            <div>
              {filteredLearners.length > 0 ? (
                filteredLearners.map((learner) => (
                  <LearnerRow
                    key={learner.learnerId}
                    learner={learner}
                    onFlag={handleFlag}
                    flagging={flagging}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Search}
                  title="No learners found."
                  copy={query ? 'Try a different search term.' : 'Learners will appear here after they join this cohort.'}
                />
              )}
            </div>
          </motion.div>

          <motion.aside variants={cardV} className="flex flex-col gap-4">
            <div className="rounded-input border border-[#ded7cd] bg-white/72 p-5 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase text-primary">Risk mix</p>
                <ShieldAlert size={20} className="text-accent" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {['low', 'medium', 'high', 'critical'].map((level) => (
                  <div key={level} className="rounded-input border border-[#ded7cd] bg-white/70 p-4">
                    <p className="font-display text-3xl font-extrabold text-text">
                      {active?.atRiskCounts?.[level] ?? activeRisk?.atRiskCounts?.[level] ?? 0}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-muted">{level}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-input border border-[#ded7cd] bg-white/72 p-5 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase text-primary">Weakest skills</p>
                <BarChart3 size={20} className="text-accent" />
              </div>
              <div className="mt-5 flex flex-col gap-3">
                {(activeHeatmap?.skills ?? []).slice(0, 5).map((skill) => (
                  <HeatBar key={skill.skillId} skill={skill} />
                ))}
                {(activeHeatmap?.skills ?? []).length === 0 && (
                  <EmptyState
                    icon={BarChart3}
                    title="No skill signal yet."
                    copy="Skill heatmaps will appear once learners complete onboarding or check-ins."
                  />
                )}
              </div>
            </div>
          </motion.aside>
        </section>
      </motion.div>
      {flagTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-input border border-[#ded7cd] bg-background p-5 shadow-[0_30px_90px_rgba(26,26,26,0.25)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-primary">Flag learner</p>
                <h2 className="mt-1 font-display text-3xl font-extrabold text-text">{flagTarget.name}</h2>
              </div>
              <ShieldAlert size={24} className="text-accent" />
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-extrabold text-text">Follow-up note</span>
              <textarea
                value={flagNote}
                onChange={(event) => setFlagNote(event.target.value)}
                rows={5}
                className="mt-2 w-full resize-none rounded-input border border-[#d8d0c4] bg-white px-4 py-3 text-sm leading-6 text-text outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="What should the instructor team know?"
              />
            </label>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setFlagTarget(null)}
                className="inline-flex h-11 items-center justify-center rounded-input border border-[#d8d0c4] bg-white px-5 text-sm font-extrabold text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFlag}
                disabled={!flagNote.trim() || flagging === flagTarget.learnerId}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {flagging === flagTarget.learnerId ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                Save flag
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
