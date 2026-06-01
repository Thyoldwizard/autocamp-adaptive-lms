'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { get, post } from '@/lib/api';
import { EmptyState, PageSkeleton, StudentShell } from '@/components/AppShell';
import { EASE_OUT } from '@/lib/constants';

const fallbackStarterPrompts = [
  'Explain my weakest skill in plain English.',
  'Give me a 30 minute practice plan.',
  'What should I focus on before the next module?',
  'Help me understand my current risk signals.',
];

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Shell({ children }) {
  return <StudentShell contentClassName="min-h-screen" max="max-w-7xl">{children}</StudentShell>;
}

function LoadingState() {
  return <PageSkeleton />;
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-primary text-white">
          <Bot size={17} />
        </div>
      )}
      <div
        className={`max-w-[760px] rounded-input px-4 py-3 shadow-card ${
          isUser
            ? 'bg-primary text-white'
            : 'border border-[#ded7cd] bg-white/78 text-text backdrop-blur-xl'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
        {message.createdAt && (
          <p className={`mt-2 text-[11px] font-bold uppercase ${isUser ? 'text-white/60' : 'text-muted'}`}>
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
      {isUser && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-accent text-text">
          <User size={17} />
        </div>
      )}
    </motion.div>
  );
}

export default function StudentCompanionPage() {
  const [messages, setMessages] = useState([]);
  const [starterPrompts, setStarterPrompts] = useState(fallbackStarterPrompts);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  function load() {
    setLoading(true);
    setError('');

    Promise.all([get('/student/dashboard'), get('/student/skills')])
      .then(([data, skills]) => {
        const recent = data.recentActivity ?? [];
        const shaped = recent.map((item) => ({
          role: item.role ?? 'assistant',
          content: item.content ?? item.message ?? item.response ?? '',
          createdAt: item.created_at ?? item.createdAt ?? item.timestamp,
        }));
        setMessages(shaped);
        const focusSkills = [...(skills.weak ?? []), ...(skills.developing ?? [])]
          .filter((skill) => skill?.name || skill?.code)
          .slice(0, 3);
        if (focusSkills.length > 0) {
          setStarterPrompts([
            `Explain ${focusSkills[0].name ?? focusSkills[0].code} in plain English.`,
            `Give me a 30 minute practice plan for ${focusSkills[0].name ?? focusSkills[0].code}.`,
            focusSkills[1]
              ? `Quiz me on ${focusSkills[1].name ?? focusSkills[1].code}.`
              : 'What should I focus on before the next module?',
            focusSkills[2]
              ? `Show me common mistakes in ${focusSkills[2].name ?? focusSkills[2].code}.`
              : 'Help me understand my current risk signals.',
          ]);
        }
      })
      .catch((err) => setError(err.message || 'Could not load companion context'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || sending) return;

    setInput('');
    setError('');
    setSending(true);

    const userMessage = { role: 'user', content, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);

    try {
      const result = await post('/student/companion', { message: content });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.response ?? 'I saved the context, but did not receive a response.',
          createdAt: new Date().toISOString(),
          signalCreated: result.signalCreated,
        },
      ]);
    } catch (err) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <Shell>
      <section className="mt-10 grid flex-1 gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="flex flex-col gap-5">
          <div className="rounded-input border border-[#ded7cd] bg-primary p-6 text-white shadow-[0_24px_80px_rgba(45,37,24,0.12)]">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-white/70">
              <Sparkles size={14} className="text-accent" />
              AI learning companion
            </div>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.96]">
              Ask for the next useful step.
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/80">
              Use the companion for explanations, practice plans, and help requests. Help requests can become support signals.
            </p>
          </div>

          <div className="rounded-input border border-[#ded7cd] bg-white/72 p-5 shadow-card backdrop-blur-2xl">
            <p className="text-[11px] font-extrabold uppercase text-primary">Try asking</p>
            <div className="mt-4 flex flex-col gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-input border border-[#ded7cd] bg-white/80 px-4 py-3 text-left text-sm font-bold text-text transition-colors hover:bg-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[680px] flex-col overflow-hidden rounded-input border border-[#ded7cd] bg-white/70 shadow-[0_24px_80px_rgba(45,37,24,0.08)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-[#ded7cd] px-5 py-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-primary">Conversation</p>
              <h2 className="font-display text-2xl font-extrabold text-text">Companion workspace</h2>
            </div>
            <MessageSquareText size={23} className="text-accent" />
          </div>

          {error && (
            <div className="mx-5 mt-5 flex items-start gap-3 rounded-input border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <MessageBubble key={`${message.createdAt}-${index}`} message={message} />
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <EmptyState
                  icon={Bot}
                  title="No companion history yet."
                  copy="Start with a weak skill, a confusing module, or a practice plan."
                />
              </div>
            )}
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-primary text-white">
                  <Bot size={17} />
                </div>
                <div className="flex items-center gap-1.5 rounded-input border border-[#ded7cd] bg-white/78 px-5 py-4 shadow-card backdrop-blur-xl">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                      className="block h-2 w-2 rounded-full bg-primary/55"
                    />
                  ))}
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="border-t border-[#ded7cd] bg-white/80 p-4"
          >
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for help with a skill, module, or next step"
                rows={2}
                className="max-h-36 min-h-12 flex-1 resize-none rounded-input border border-[#d8d0c4] bg-white px-4 py-3 text-sm text-text outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-input bg-primary text-white transition-opacity disabled:opacity-50"
                aria-label="Send message"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={19} />}
              </button>
            </div>
          </form>
        </section>
      </section>
    </Shell>
  );
}
