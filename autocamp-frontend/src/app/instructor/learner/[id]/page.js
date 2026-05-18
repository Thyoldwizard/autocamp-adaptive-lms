'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { get, post } from '@/lib/api';
import { EmptyState, InstructorShell, PageSkeleton } from '@/components/AppShell';

const EASE_OUT = [0.16, 1, 0.3, 1];

const RISK = {
  low: { label: 'Low risk', cls: 'bg-primary/10 text-primary' },
  medium: { label: 'Medium risk', cls: 'bg-accent/20 text-[#9b5f1e]' },
  high: { label: 'High risk', cls: 'bg-danger/10 text-danger' },
  critical: { label: 'Critical risk', cls: 'bg-red-100 text-red-700' },
};

function pct(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n > 1 ? n : n * 100);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function LoadingState() {
  return <PageSkeleton shell="instructor" />;
}

function ErrorState({ error, onRetry }) {
  return (
    <InstructorShell>
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
    </InstructorShell>
  );
}

function MetricCard({ icon: Icon, label, value, copy }) {
  return (
    <div className="rounded-input border border-[#ded7cd] bg-white/72 p-5 shadow-[0_20px_70px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-muted">{label}</p>
          <p className="mt-2 font-display text-4xl font-extrabold text-text">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-input bg-primary/10 text-primary">
          <Icon size={22} />
        </div>
      </div>
      {copy && <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>}
    </div>
  );
}

export default function InstructorLearnerDetailPage() {
  const params = useParams();
  const learnerId = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [flagging, setFlagging] = useState(false);

  const load = useCallback(() => {
    if (!learnerId) return;
    setLoading(true);
    setError('');
    get(`/instructor/learner/${learnerId}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load learner detail'))
      .finally(() => setLoading(false));
  }, [learnerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitFlag() {
    if (!flagNote.trim() || !learnerId) return;
    setFlagging(true);
    setError('');
    try {
      await post(`/instructor/learner/${learnerId}/flag`, { note: flagNote.trim() });
      setFlagOpen(false);
      setFlagNote('');
      load();
    } catch (err) {
      setError(err.message || 'Could not flag learner');
    } finally {
      setFlagging(false);
    }
  }

  const weakSkills = useMemo(() => {
    return [...(data?.skillState ?? [])]
      .sort((a, b) => Number(a.proficiency) - Number(b.proficiency))
      .slice(0, 5);
  }, [data]);

  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const { learner, analysis, progress = [], recentSignals = [], recentMessages = [] } = data;
  const risk = RISK[analysis?.atRisk?.level] ?? RISK.low;
  const completed = progress.filter((item) => item.status === 'completed').length;
  const active = progress.filter((item) => item.status === 'in_progress' || item.status === 'stalled').length;

  return (
    <InstructorShell eyebrow="Learner detail">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE_OUT }}>
        <div className="mt-6">
          <Link href="/instructor/cohort" className="inline-flex h-10 items-center gap-2 rounded-badge border border-[#ded7cd] bg-white/70 px-4 text-sm font-extrabold text-primary shadow-card backdrop-blur-xl">
            <ArrowLeft size={15} />
            Cohort
          </Link>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-stretch">
          <div className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl sm:p-8">
            <p className="mb-4 text-xs font-extrabold uppercase text-primary">{learner.cohort}</p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.96] text-text sm:text-7xl">
              {learner.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
              {learner.program}
              {learner.stated_goal ? ` · ${learner.stated_goal}` : ''}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className={`rounded-badge px-3 py-1.5 text-xs font-extrabold ${risk.cls}`}>{risk.label}</span>
              <span className="rounded-badge bg-white px-3 py-1.5 text-xs font-extrabold text-muted shadow-card">
                {analysis?.goalProgress?.percentage ?? 0}% goal progress
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-input bg-primary p-6 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)] sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-white/70">Recommended intervention</p>
              <Target size={22} className="text-accent" />
            </div>
            <h2 className="mt-6 font-display text-4xl font-extrabold leading-tight">
              {analysis?.nextBestAction?.moduleName ?? analysis?.nextBestAction?.moduleCode ?? 'No module action yet'}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/80">
              {analysis?.nextBestAction?.reason ?? analysis?.atRisk?.reasons?.[0] ?? 'No immediate intervention required.'}
            </p>
            <button
              type="button"
              onClick={() => setFlagOpen(true)}
              className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-input bg-white px-5 text-sm font-extrabold text-primary"
            >
              <ShieldAlert size={15} />
              Flag with note
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard icon={CheckCircle2} label="Completed" value={completed} copy="Finished modules." />
          <MetricCard icon={Clock} label="Active" value={active} copy="In-progress or stalled modules." />
          <MetricCard icon={ShieldAlert} label="Signals" value={recentSignals.length} copy="Recent unresolved or historical signals." />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-primary">Weakest skills</p>
              <Brain size={22} className="text-accent" />
            </div>
            <div className="mt-5 grid gap-3">
              {weakSkills.length > 0 ? weakSkills.map((row) => {
                const value = pct(row.proficiency);
                return (
                  <div key={row.skill_id} className="rounded-input border border-[#ded7cd] bg-white/78 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-display text-xl font-extrabold text-text">{row.skill?.name ?? row.skill?.code ?? 'Skill'}</p>
                        <p className="mt-1 text-xs font-bold uppercase text-muted">{row.skill?.domain ?? row.skill?.code}</p>
                      </div>
                      <span className="font-display text-2xl font-extrabold text-primary">{value}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-badge bg-[#e5ded4]">
                      <div className="h-full rounded-badge bg-primary" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              }) : (
                <EmptyState icon={Brain} title="No skill state yet." copy="Skill evidence will appear after onboarding or check-ins." />
              )}
            </div>
          </div>

          <div className="rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-primary">Recent signals</p>
              <BarChart3 size={22} className="text-accent" />
            </div>
            <div className="mt-5 divide-y divide-[#ded7cd]">
              {recentSignals.length > 0 ? recentSignals.slice(0, 6).map((signal) => (
                <div key={signal.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-text">{signal.signal_type?.replaceAll('_', ' ')}</p>
                    <span className="rounded-badge bg-danger/10 px-3 py-1.5 text-xs font-extrabold text-danger">
                      {signal.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{signal.notes ?? signal.context?.reason ?? 'No note recorded.'}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-muted">{formatDate(signal.created_at)}</p>
                </div>
              )) : (
                <EmptyState icon={ShieldAlert} title="No recent signals." copy="This learner has no recent struggle signals in the active window." />
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-input border border-[#ded7cd] bg-white/72 p-6 shadow-card backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase text-primary">Companion context</p>
            <MessageSquareText size={22} className="text-accent" />
          </div>
          <div className="mt-5 divide-y divide-[#ded7cd]">
            {recentMessages.length > 0 ? recentMessages.slice(0, 5).map((message) => (
              <div key={message.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-bold capitalize text-primary">{message.role}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{message.content}</p>
              </div>
            )) : (
              <EmptyState icon={MessageSquareText} title="No companion history." copy="Conversation context will appear after the learner uses the companion." />
            )}
          </div>
        </section>
      </motion.div>

      {flagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-input border border-[#ded7cd] bg-background p-5 shadow-[0_30px_90px_rgba(26,26,26,0.25)]">
            <p className="text-[11px] font-extrabold uppercase text-primary">Flag learner</p>
            <h2 className="mt-1 font-display text-3xl font-extrabold text-text">{learner.name}</h2>
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
                onClick={() => setFlagOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-input border border-[#d8d0c4] bg-white px-5 text-sm font-extrabold text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFlag}
                disabled={!flagNote.trim() || flagging}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {flagging ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                Save flag
              </button>
            </div>
          </div>
        </div>
      )}
    </InstructorShell>
  );
}
