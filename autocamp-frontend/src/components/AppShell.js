'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { animate } from 'framer-motion';
import {
  BarChart3,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Radar,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { clearToken, getToken } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function BrandWordmark() {
  return (
    <Link href="/" aria-label="atomcamp home" className="font-display text-2xl font-extrabold leading-none text-primary">
      atom<span className="text-accent">camp</span>
    </Link>
  );
}

function useLogout() {
  const router = useRouter();
  return async () => {
    const token = getToken();
    try {
      if (token) {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Local sign-out should still complete if the server session is already gone.
    } finally {
      clearToken();
      router.push('/login');
    }
  };
}

function isActive(pathname, href) {
  if (href.includes('#')) {
    return typeof window !== 'undefined' && pathname === href.split('#')[0] && window.location.hash === `#${href.split('#')[1]}`;
  }
  const cleanHref = href.split('#')[0];
  if (cleanHref === '/student/dashboard') {
    return pathname === cleanHref;
  }
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function scrollToProgress() {
  const target = document.getElementById('progress');
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 24;
  const controls = animate(window.scrollY, top, {
    duration: 0.55,
    ease: [0.16, 1, 0.3, 1],
    onUpdate: (value) => window.scrollTo(0, value),
  });

  target.classList.add('ring-2', 'ring-accent/40');
  window.setTimeout(() => {
    controls.stop();
    target.classList.remove('ring-2', 'ring-accent/40');
  }, 900);
}

const studentNav = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Progress', href: '/student/dashboard#progress', icon: BarChart3 },
  { label: 'Skills', href: '/student/skills', icon: BookOpenCheck },
  { label: 'Companion', href: '/student/companion', icon: MessageSquareText },
];

const instructorNav = [
  { label: 'Cohort', href: '/instructor/cohort', icon: Users },
];

function StudentNavLink({ item, compact = false }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  function handleClick(event) {
    if (item.href.includes('#progress') && pathname === '/student/dashboard') {
      event.preventDefault();
      scrollToProgress();
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-extrabold transition-colors ${
        active ? 'bg-primary text-white' : 'text-muted hover:bg-white/80 hover:text-primary'
      } ${compact ? 'flex-col gap-1 px-2 py-2 text-[11px]' : ''}`}
    >
      <Icon size={compact ? 18 : 17} />
      {item.label}
    </Link>
  );
}

export function StudentShell({ children, max = 'max-w-7xl', contentClassName = '' }) {
  const logout = useLogout();

  return (
    <main className="min-h-screen bg-background pb-24 lg:pb-0">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(45,106,79,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[248px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-[#ded7cd] bg-white/58 px-5 py-6 shadow-[18px_0_80px_rgba(45,37,24,0.06)] backdrop-blur-2xl lg:block">
          <BrandWordmark />
          <div className="mt-8 flex items-center gap-2 rounded-input bg-primary/10 px-3 py-3 text-xs font-extrabold uppercase text-primary">
            <GraduationCap size={15} className="text-accent" />
            Student workspace
          </div>
          <nav className="mt-6 flex flex-col gap-2">
            {studentNav.map((item) => <StudentNavLink key={item.href} item={item} />)}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="absolute bottom-6 left-5 right-5 inline-flex h-11 items-center justify-center gap-2 rounded-input border border-[#d8d0c4] bg-white/80 text-sm font-extrabold text-primary transition-colors hover:bg-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </aside>

        <section className={`${contentClassName}`}>
          <div className={`mx-auto ${max} px-5 py-6 sm:px-8 lg:px-10`}>
            <header className="flex items-center justify-between gap-4 lg:hidden">
              <BrandWordmark />
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 items-center gap-2 rounded-badge border border-[#ded7cd] bg-white/70 px-4 text-sm font-extrabold text-primary shadow-card backdrop-blur-xl"
              >
                <LogOut size={15} />
                Logout
              </button>
            </header>
            {children}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-input border border-[#ded7cd] bg-white/88 p-2 shadow-[0_18px_60px_rgba(45,37,24,0.18)] backdrop-blur-2xl lg:hidden">
        {studentNav.map((item) => <StudentNavLink key={item.href} item={item} compact />)}
      </nav>
    </main>
  );
}

function InstructorNavLink({ item }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`inline-flex h-10 items-center gap-2 rounded-badge px-4 text-sm font-extrabold transition-colors ${
        active ? 'bg-primary text-white' : 'border border-[#ded7cd] bg-white/70 text-primary hover:bg-white'
      }`}
    >
      <Icon size={15} />
      {item.label}
    </Link>
  );
}

export function InstructorShell({ children, eyebrow = 'Instructor intelligence', max = 'max-w-7xl' }) {
  const logout = useLogout();

  return (
    <main className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(45,106,79,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className={`mx-auto ${max} px-5 py-6 sm:px-8 lg:px-10`}>
        <header className="flex flex-col gap-4 border-b border-[#ded7cd] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandWordmark />
            <div className="hidden items-center gap-2 rounded-badge border border-[#ded7cd] bg-white/70 px-4 py-2 text-xs font-extrabold uppercase text-primary shadow-card backdrop-blur-xl md:flex">
              <Radar size={14} className="text-accent" />
              {eyebrow}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {instructorNav.map((item) => <InstructorNavLink key={item.href} item={item} />)}
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 items-center gap-2 rounded-badge border border-[#ded7cd] bg-white/70 px-4 text-sm font-extrabold text-primary shadow-card backdrop-blur-xl"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function EmptyState({ icon: Icon = ShieldAlert, title, copy, action }) {
  return (
    <div className="rounded-input border border-[#ded7cd] bg-white/70 p-6 text-center shadow-card backdrop-blur-xl">
      <Icon size={30} className="mx-auto text-primary" />
      <p className="mt-3 font-display text-2xl font-extrabold text-text">{title}</p>
      {copy && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{copy}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-input bg-[#e8e0d6] ${className}`} />;
}

export function PageSkeleton({ shell = 'student', rows = 3 }) {
  const Shell = shell === 'instructor' ? InstructorShell : StudentShell;
  return (
    <Shell>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.65fr]">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => <SkeletonBlock key={index} className="h-36" />)}
      </div>
      <SkeletonBlock className="mt-6 h-80" />
    </Shell>
  );
}
