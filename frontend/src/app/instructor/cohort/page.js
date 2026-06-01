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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { get, post } from '@/lib/api';
import { EmptyState, InstructorShell, PageSkeleton } from '@/components/AppShell';
import { Card, MetricCard, RiskBadge, Modal, ProgressBar } from '@/components/ui';
import { CARD_V, CONTAINER_V } from '@/lib/constants';

function pct(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value));
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

function HeatBar({ skill }) {
  const avg = pct((skill.averageProficiency ?? 0) * 100);
  return (
    <Card variant="flat" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-text">{skill.skillName || skill.skillCode}</p>
          <p className="mt-1 text-xs font-bold uppercase text-muted">
            {skill.learnersStruggling} struggling · {skill.learnersStrong} strong
          </p>
        </div>
        <span className="font-display text-2xl font-extrabold text-primary">{avg}%</span>
      </div>
      <ProgressBar value={avg} className="mt-3" />
    </Card>
  );
}

function skillBarColor(avg) {
  if (avg < 0.4) return '#E63946';
  if (avg < 0.7) return '#F4A261';
  return '#2D6A4F';
}

function SkillTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-input border border-[#ded7cd] bg-white px-3 py-2 text-xs font-extrabold text-primary shadow-card">
      {payload[0].payload.skillName}: {Math.round(payload[0].value * 100)}%
    </div>
  );
}

function SkillProficiencyChart({ skills = [] }) {
  if (!skills.length) return null;
  const chartHeight = Math.max(skills.length * 52, 120);
  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={skills} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 11, fontWeight: 700, fill: '#9b8f83' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="skillName"
            width={130}
            tick={{ fontSize: 12, fontWeight: 700, fill: '#2c2410' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<SkillTooltip />} cursor={{ fill: 'rgba(45,106,79,0.06)' }} />
          <Bar dataKey="averageProficiency" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {skills.map((skill) => (
              <Cell key={skill.skillId} fill={skillBarColor(skill.averageProficiency)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LearnerRow({ learner, onFlag, flagging }) {
  const level = learner.atRisk?.level ?? 'low';
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
        <RiskBadge level={level} />
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
  const [overview, setOverview]       = useState(null);
  const [atRisk, setAtRisk]           = useState(null);
  const [heatmap, setHeatmap]         = useState(null);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [query, setQuery]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [flagging, setFlagging]       = useState('');
  const [flagTarget, setFlagTarget]   = useState(null);
  const [flagNote, setFlagNote]       = useState('');

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

  useEffect(() => { load(); }, []);

  function handleFlag(learner) {
    setFlagTarget(learner);
    setFlagNote('');
  }

  async function submitFlag() {
    if (!flagTarget || !flagNote.trim()) return;
    const learner = flagTarget;
    setFlagging(learner.learnerId);
    try {
      await post(`/instructor/learner/${learner.learnerId}/flag`, { note: flagNote.trim() });
      setFlagTarget(null);
      setFlagNote('');
      load();
    } catch (err) {
      setError(err.message || 'Could not flag learner');
    } finally {
      setFlagging('');
    }
  }

  const cohorts       = flattenCohorts(overview);
  const active        = cohorts.find((c) => c.cohort === selectedCohort) ?? cohorts[0];
  const activeRisk    = flattenCohorts(atRisk).find((c) => c.cohort === active?.cohort);
  const activeHeatmap = flattenCohorts(heatmap).find((c) => c.cohort === active?.cohort);
  const allLearners   = useMemo(() => active?.learners ?? [], [active]);

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
    const actionCount   = flattenCohorts(atRisk).reduce((sum, c) => sum + (c.totalLearners ?? 0), 0);
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
      <motion.div variants={CONTAINER_V} initial="hidden" animate="show">
        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-end">
          <motion.div variants={CARD_V}>
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
            variants={CARD_V}
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
          <MetricCard icon={Users}     label="Learners"         value={totals.totalLearners} copy="Across authorized cohorts." />
          <MetricCard icon={Flame}     label="Needs attention"  value={totals.actionCount}   copy="Medium, high, or critical risk." />
          <MetricCard icon={LineChart} label="Avg. progress"    value={`${totals.avg}%`}     copy="Mean goal progress across cohorts." />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
          <motion.div variants={CARD_V}>
            <Card className="overflow-hidden">
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
            </Card>
          </motion.div>

          <motion.aside variants={CARD_V} className="flex flex-col gap-4">
            <Card className="p-5">
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
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase text-primary">Skill proficiency</p>
                <BarChart3 size={20} className="text-accent" />
              </div>
              <div className="mt-5">
                {(activeHeatmap?.skills ?? []).length > 0 ? (
                  <SkillProficiencyChart skills={activeHeatmap.skills} />
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No skill signal yet."
                    copy="Skill heatmaps will appear once learners complete onboarding or check-ins."
                  />
                )}
              </div>
            </Card>
          </motion.aside>
        </section>
      </motion.div>

      <Modal open={!!flagTarget} onClose={() => setFlagTarget(null)}>
        {flagTarget && (
          <>
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
                onChange={(e) => setFlagNote(e.target.value)}
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
          </>
        )}
      </Modal>
    </Shell>
  );
}
