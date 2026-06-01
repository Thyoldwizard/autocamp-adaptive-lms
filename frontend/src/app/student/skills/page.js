'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  Database,
  Globe,
  RefreshCw,
  Search,
  Sparkles,
  Terminal,
  Wrench,
} from 'lucide-react';

const DOMAIN_ICON = {
  data:        Database,
  analytics:   BarChart3,
  programming: Terminal,
  tools:       Wrench,
  ml:          Brain,
  ai:          Sparkles,
};
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
import { EmptyState, PageSkeleton, StudentShell } from '@/components/AppShell';
import { Card, ProgressBar } from '@/components/ui';
import { CARD_V, CONTAINER_V, BAND } from '@/lib/constants';
import { useFetch } from '@/hooks/useFetch';

function pct(value) {
  return Math.round((Number(value) || 0) * 100);
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

function SkillCard({ skill, band }) {
  const meta = BAND[band];
  const value = pct(skill.proficiency);
  const DomainIcon = DOMAIN_ICON[skill.domain?.toLowerCase()] ?? Globe;

  return (
    <Card variant="flat" className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-input ${meta.cls}`}>
            <DomainIcon size={14} />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold text-text">{skill.name ?? skill.code}</p>
            <p className="mt-0.5 text-xs font-bold uppercase text-muted">{skill.domain ?? skill.code}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-badge px-3 py-1.5 text-xs font-extrabold ${meta.cls}`}>
          {value}%
        </span>
      </div>
      <ProgressBar value={value} className="mt-4" />
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm leading-6 text-muted">
          {value >= 70 ? 'Ready to apply in projects.' : value >= 40 ? 'Keep building consistency.' : 'Needs focused practice.'}
        </span>
        <Link
          href={`/student/checkin/${skill.code}`}
          className="inline-flex h-9 items-center gap-2 rounded-input bg-primary px-3 text-xs font-extrabold text-white"
        >
          Check in
          <ArrowRight size={13} />
        </Link>
      </div>
    </Card>
  );
}

function BandColumn({ band, items }) {
  const meta = BAND[band];
  const Icon = meta.icon;

  return (
    <motion.section
      variants={CARD_V}
      className="rounded-input border border-[#ded7cd] bg-white/58 p-4 shadow-[0_20px_70px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-input ${meta.cls}`}>
          <Icon size={20} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold text-text">{meta.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{meta.copy}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {items.length > 0 ? (
          items.map((skill) => <SkillCard key={skill.skillId ?? skill.code} skill={skill} band={band} />)
        ) : (
          <EmptyState
            icon={meta.icon}
            title={`No ${meta.title.toLowerCase()} skills yet.`}
            copy="This section will fill in as your learner model gathers signal."
          />
        )}
      </div>
    </motion.section>
  );
}

function barColor(proficiency) {
  if (proficiency >= 0.7) return '#2D6A4F';
  if (proficiency >= 0.4) return '#F4A261';
  return '#E63946';
}

function SkillsBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-input border border-[#ded7cd] bg-white px-3 py-2 text-xs font-extrabold text-primary shadow-card">
      {payload[0].payload.name}: {Math.round(payload[0].value * 100)}%
    </div>
  );
}

function AllSkillsChart({ strong = [], developing = [], weak = [] }) {
  const allSkills = [...strong, ...developing, ...weak].filter((s) => s.proficiency > 0 || s.proficiency === 0);
  if (allSkills.length === 0) return null;

  const chartHeight = Math.min(allSkills.length * 44, 400);

  return (
    <motion.div variants={CARD_V}>
      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-extrabold uppercase text-primary">All skills — proficiency overview</p>
          <BarChart3 size={20} className="text-accent" />
        </div>
        <div className="mt-5 overflow-y-auto" style={{ maxHeight: 400 }}>
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={allSkills} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
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
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#2c2410' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SkillsBarTooltip />} cursor={{ fill: 'rgba(45,106,79,0.06)' }} />
                <Bar dataKey="proficiency" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {allSkills.map((skill) => (
                    <Cell key={skill.skillId ?? skill.code} fill={barColor(skill.proficiency)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function StudentSkillsPage() {
  const [query, setQuery] = useState('');
  const { data, loading, error, reload: load } = useFetch('/student/skills', 'Could not load skills');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const empty = { strong: [], developing: [], weak: [] };
    if (!data) return empty;
    return Object.fromEntries(
      Object.entries(empty).map(([band]) => [
        band,
        (data[band] ?? []).filter((skill) => {
          if (!q) return true;
          return `${skill.name ?? ''} ${skill.code ?? ''} ${skill.domain ?? ''}`.toLowerCase().includes(q);
        }),
      ]),
    );
  }, [data, query]);

  const totals = data
    ? {
        all:      (data.strong?.length ?? 0) + (data.developing?.length ?? 0) + (data.weak?.length ?? 0),
        strong:   data.strong?.length ?? 0,
        practice: (data.developing?.length ?? 0) + (data.weak?.length ?? 0),
      }
    : { all: 0, strong: 0, practice: 0 };

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState error={error} onRetry={load} />;

  return (
    <Shell>
      <motion.div variants={CONTAINER_V} initial="hidden" animate="show">
        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.78fr] lg:items-end">
          <motion.div variants={CARD_V}>
            <p className="mb-4 text-xs font-extrabold uppercase text-primary">Skill map</p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.96] text-text sm:text-7xl">
              Know where to push next.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
              A focused view of your strong, developing, and weak skills, with check-ins ready
              for the areas that need signal.
            </p>
          </motion.div>

          <motion.div
            variants={CARD_V}
            className="rounded-input border border-[#ded7cd] bg-primary p-5 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase text-white/70">Skill signal</p>
              <Sparkles size={19} className="text-accent" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div>
                <p className="font-display text-4xl font-extrabold">{totals.all}</p>
                <p className="mt-1 text-xs font-bold uppercase text-white/70">Tracked</p>
              </div>
              <div>
                <p className="font-display text-4xl font-extrabold">{totals.strong}</p>
                <p className="mt-1 text-xs font-bold uppercase text-white/70">Strong</p>
              </div>
              <div>
                <p className="font-display text-4xl font-extrabold">{totals.practice}</p>
                <p className="mt-1 text-xs font-bold uppercase text-white/70">Practice</p>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.div variants={CARD_V} className="mt-8 flex items-center gap-2 rounded-input border border-[#ded7cd] bg-white/74 px-4 shadow-card backdrop-blur-xl">
          <Search size={17} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills"
            className="h-12 w-full bg-transparent text-sm font-medium text-text outline-none placeholder:text-muted/70"
          />
        </motion.div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <BandColumn band="strong"     items={filtered.strong} />
          <BandColumn band="developing" items={filtered.developing} />
          <BandColumn band="weak"       items={filtered.weak} />
        </div>

        <AllSkillsChart strong={data?.strong ?? []} developing={data?.developing ?? []} weak={data?.weak ?? []} />

        <motion.div variants={CARD_V}>
          <Card className="mt-6 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-primary">Companion support</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Ask for a practice plan or explanation for any weak skill.
                </p>
              </div>
              <Link
                href="/student/companion"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white"
              >
                Open companion
                <BookOpenCheck size={15} />
              </Link>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </Shell>
  );
}
