'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MessageSquareText,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { post } from '@/lib/api';
import { PageSkeleton, StudentShell } from '@/components/AppShell';

const EASE_OUT = [0.16, 1, 0.3, 1];

function prettySkill(code) {
  return String(code || '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function Shell({ children }) {
  return <StudentShell max="max-w-5xl">{children}</StudentShell>;
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
          Start again
        </button>
      </div>
    </Shell>
  );
}

function ResultPanel({ result, skillName, onRestart }) {
  const passed = (result?.score ?? 0) >= 75;
  const review = result?.review ?? [];

  return (
    <Shell>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="mt-10 overflow-hidden rounded-input border border-[#ded7cd] bg-white/74 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl"
      >
        <div className="bg-primary p-6 text-white sm:p-8">
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-white/70">
            <Sparkles size={14} className="text-accent" />
            Check-in complete
          </div>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.96] sm:text-7xl">
            {result.score}%
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/80">
            {passed
              ? `Strong signal on ${skillName}. Keep applying it in modules and projects.`
              : `${skillName} needs another focused practice pass before it feels automatic.`}
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
          <div className="rounded-input border border-[#ded7cd] bg-white/80 p-5">
            <p className="font-display text-4xl font-extrabold text-text">{result.correctAnswers}</p>
            <p className="mt-1 text-xs font-bold uppercase text-muted">Correct</p>
          </div>
          <div className="rounded-input border border-[#ded7cd] bg-white/80 p-5">
            <p className="font-display text-4xl font-extrabold text-text">{result.totalQuestions}</p>
            <p className="mt-1 text-xs font-bold uppercase text-muted">Questions</p>
          </div>
          <div className="rounded-input border border-[#ded7cd] bg-white/80 p-5">
            <p className="font-display text-4xl font-extrabold text-text">
              {Math.round((result.updatedProficiency ?? 0) * 100)}%
            </p>
            <p className="mt-1 text-xs font-bold uppercase text-muted">Updated skill</p>
          </div>
        </div>
        {review.length > 0 && (
          <div className="border-t border-[#ded7cd] p-6 sm:p-8">
            <p className="text-[11px] font-extrabold uppercase text-primary">Question review</p>
            <div className="mt-4 grid gap-3">
              {review.map((item, index) => (
                <div key={`${item.question}-${index}`} className="rounded-input border border-[#ded7cd] bg-white/80 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-extrabold leading-6 text-text">
                      {index + 1}. {item.question}
                    </p>
                    <span className={`shrink-0 rounded-badge px-3 py-1.5 text-xs font-extrabold ${
                      item.isCorrect ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'
                    }`}>
                      {item.isCorrect ? 'Correct' : 'Review'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.explanation}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-muted">
                    Correct answer: {item.options?.[item.correctIndex] ?? `Option ${item.correctIndex + 1}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {!passed && (
          <div className="border-t border-[#ded7cd] bg-accent/15 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-primary">Companion support</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Your {skillName} score was low. Ask the AI companion for a targeted explanation and practice plan.
                </p>
              </div>
              <Link
                href="/student/companion"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white"
              >
                Open companion
                <MessageSquareText size={15} />
              </Link>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-[#ded7cd] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <Link
            href="/student/skills"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-input border border-[#d8d0c4] bg-white/80 px-5 text-sm font-extrabold text-primary"
          >
            Back to skills
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white"
          >
            Retake check-in
            <RefreshCw size={15} />
          </button>
        </div>
      </motion.section>
    </Shell>
  );
}

export default function SkillCheckinPage() {
  const params = useParams();
  const skillCode = params?.skillCode;

  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const skillName = session?.skillName ?? prettySkill(skillCode);

  const start = useCallback(() => {
    if (!skillCode) return;
    setLoading(true);
    setError('');
    setResult(null);

    post(`/student/checkin/start/${skillCode}`)
      .then((data) => {
        setSession(data);
        setAnswers(Array(data.questions?.length ?? 0).fill(null));
      })
      .catch((err) => setError(err.message || 'Could not start check-in'))
      .finally(() => setLoading(false));
  }, [skillCode]);

  useEffect(() => {
    start();
  }, [skillCode, start]);

  const complete = useMemo(() => answers.length > 0 && answers.every((answer) => answer !== null), [answers]);

  async function submit() {
    if (!session || !complete) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await post(`/student/checkin/submit/${session.skillCode}`, {
        sessionId: session.sessionId,
        answers,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not submit check-in');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error && !session) return <ErrorState error={error} onRetry={start} />;
  if (result) return <ResultPanel result={result} skillName={skillName} onRestart={start} />;

  return (
    <Shell>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="mt-10"
      >
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="rounded-input border border-[#ded7cd] bg-primary p-6 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)]">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-white/70">
              <Target size={14} className="text-accent" />
              Skill check-in
            </div>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.96]">
              {skillName}
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/80">
              Answer every question. Your score updates the learner model and may create support signals.
            </p>
            <div className="mt-6 rounded-input border border-white/20 bg-white/10 p-4 backdrop-blur-2xl">
              <p className="font-display text-4xl font-extrabold">
                {answers.filter((answer) => answer !== null).length}/{answers.length}
              </p>
              <p className="mt-1 text-xs font-bold uppercase text-white/70">Answered</p>
            </div>
          </aside>

          <div className="rounded-input border border-[#ded7cd] bg-white/74 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
            <div className="border-b border-[#ded7cd] p-5">
              <p className="text-[11px] font-extrabold uppercase text-primary">Questions</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold text-text">
                Quick signal check
              </h2>
            </div>

            {error && (
              <div className="mx-5 mt-5 flex items-start gap-3 rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-5 p-5">
              {(session?.questions ?? []).map((question, questionIndex) => (
                <div key={question.question} className="rounded-input border border-[#ded7cd] bg-white/80 p-4">
                  <p className="text-sm font-extrabold leading-6 text-text">
                    {questionIndex + 1}. {question.question}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {question.options.map((option, optionIndex) => {
                      const selected = answers[questionIndex] === optionIndex;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setAnswers((current) => {
                              const next = [...current];
                              next[questionIndex] = optionIndex;
                              return next;
                            })
                          }
                          className={`flex items-center justify-between gap-3 rounded-input border px-4 py-3 text-left text-sm font-bold transition-colors ${
                            selected
                              ? 'border-primary bg-primary text-white'
                              : 'border-[#d8d0c4] bg-white text-text hover:border-primary/40'
                          }`}
                        >
                          <span>{option}</span>
                          {selected ? <CheckCircle2 size={16} /> : <XCircle size={16} className="text-muted/40" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#ded7cd] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted">
                {complete ? 'Ready to submit.' : 'Answer all questions to submit.'}
              </p>
              <button
                type="button"
                disabled={!complete || submitting}
                onClick={submit}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-input bg-primary px-5 text-sm font-extrabold text-white transition-opacity disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit check-in'}
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </Shell>
  );
}
