'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { animate, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpenCheck,
  ChevronLeft,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Radar,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { clearToken, getToken } from '@/lib/auth';
import { getDemoRole, exitDemoMode } from '@/lib/demoMode';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const SIDEBAR_KEY = 'autocamp_sidebar_collapsed';
const EASE = [0.16, 1, 0.3, 1];

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useDemoMode() {
  const [role, setRole] = useState(null);
  useEffect(() => { setRole(getDemoRole()); }, []);
  return role;
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_KEY) === 'true') setCollapsedState(true);
  }, []);
  function setCollapsed(value) {
    setCollapsedState(value);
    localStorage.setItem(SIDEBAR_KEY, String(value));
  }
  return [collapsed, setCollapsed];
}

function useLogout() {
  const router = useRouter();
  return async () => {
    const token = getToken();
    try {
      if (token) {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* still sign out locally */ } finally {
      clearToken();
      router.push('/login');
    }
  };
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function BrandWordmark() {
  return (
    <Link href="/" aria-label="atomcamp home" className="font-display text-2xl font-extrabold leading-none text-primary">
      atom<span className="text-accent">camp</span>
    </Link>
  );
}

function BrandMark() {
  return (
    <Link href="/" aria-label="atomcamp home" className="font-display text-2xl font-extrabold leading-none text-primary">
      a<span className="text-accent">.</span>
    </Link>
  );
}

function DemoBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-badge bg-accent/20 px-2.5 py-1.5 text-[11px] font-extrabold uppercase text-primary">
      <FlaskConical size={12} />
      Demo
    </div>
  );
}

function DemoDot() {
  return (
    <span
      title="Demo mode"
      className="flex h-2 w-2 rounded-full bg-accent ring-2 ring-accent/30"
    />
  );
}

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

function isActive(pathname, href) {
  if (href.includes('#')) {
    return (
      typeof window !== 'undefined' &&
      pathname === href.split('#')[0] &&
      window.location.hash === `#${href.split('#')[1]}`
    );
  }
  const clean = href.split('#')[0];
  if (clean === '/student/dashboard') return pathname === clean;
  return pathname === clean || pathname.startsWith(`${clean}/`);
}

function scrollToProgress() {
  const target = document.getElementById('progress');
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 24;
  const controls = animate(window.scrollY, top, {
    duration: 0.55,
    ease: EASE,
    onUpdate: (v) => window.scrollTo(0, v),
  });
  target.classList.add('ring-2', 'ring-accent/40');
  window.setTimeout(() => {
    controls.stop();
    target.classList.remove('ring-2', 'ring-accent/40');
  }, 900);
}

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------

const studentNav = [
  { label: 'Dashboard', href: '/student/dashboard',          icon: LayoutDashboard },
  { label: 'Progress',  href: '/student/dashboard#progress', icon: BarChart3 },
  { label: 'Skills',    href: '/student/skills',             icon: BookOpenCheck },
  { label: 'Companion', href: '/student/companion',          icon: MessageSquareText },
];

const instructorNav = [
  { label: 'Cohort', href: '/instructor/cohort', icon: Users },
];

// ---------------------------------------------------------------------------
// Nav link — desktop (supports collapsed rail)
// ---------------------------------------------------------------------------

function SidebarNavLink({ item, collapsed }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const tooltipRef = useRef(null);

  function handleClick(e) {
    if (item.href.includes('#progress') && pathname === '/student/dashboard') {
      e.preventDefault();
      scrollToProgress();
    }
  }

  if (collapsed) {
    return (
      <div className="relative">
        <Link
          href={item.href}
          onClick={handleClick}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
          className={`group flex h-10 w-10 items-center justify-center rounded-input transition-colors mx-auto ${
            active
              ? 'bg-primary text-white shadow-[0_4px_14px_rgba(45,106,79,0.28)]'
              : 'text-muted hover:bg-white/80 hover:text-primary'
          }`}
        >
          <Icon size={18} />
          {/* Tooltip */}
          <span
            ref={tooltipRef}
            className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-input bg-primary px-3 py-1.5 text-xs font-extrabold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          >
            {item.label}
          </span>
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-extrabold transition-all ${
        active
          ? 'bg-primary text-white shadow-[0_4px_14px_rgba(45,106,79,0.22)]'
          : 'text-muted hover:bg-white/80 hover:text-primary'
      }`}
    >
      <Icon size={17} />
      <span>{item.label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar footer button (logout / exit demo)
// ---------------------------------------------------------------------------

function SidebarFooterBtn({ icon: Icon, label, onClick, variant = 'default', collapsed }) {
  const cls =
    variant === 'demo'
      ? 'border-accent/40 bg-accent/10 hover:bg-accent/20'
      : 'border-[#d8d0c4] bg-white/80 hover:bg-white';

  if (collapsed) {
    return (
      <div className="relative mx-auto w-10">
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={`group flex h-10 w-10 items-center justify-center rounded-input border text-muted transition-colors hover:text-primary ${cls}`}
        >
          <Icon size={17} />
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-input bg-primary px-3 py-1.5 text-xs font-extrabold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {label}
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-input border text-sm font-extrabold text-primary transition-colors ${cls}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Collapse toggle button
// ---------------------------------------------------------------------------

function CollapseToggle({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="flex h-8 w-8 items-center justify-center rounded-input text-muted transition-colors hover:bg-white/80 hover:text-primary"
    >
      <motion.span
        animate={{ rotate: collapsed ? 180 : 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="flex"
      >
        <ChevronLeft size={16} />
      </motion.span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shared sidebar shell
// ---------------------------------------------------------------------------

function Sidebar({ nav, workspaceLabel, workspaceIcon: WorkspaceIcon = GraduationCap, onLogout, demoRole, onExit }) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [overflowHidden, setOverflowHidden] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 248 }}
      transition={{ duration: 0.28, ease: EASE }}
      onAnimationStart={() => setOverflowHidden(true)}
      onAnimationComplete={() => setOverflowHidden(false)}
      className={`sticky top-0 hidden h-screen shrink-0 border-r border-[#ded7cd] bg-white/58 py-5 shadow-[18px_0_80px_rgba(45,37,24,0.06)] backdrop-blur-2xl lg:flex lg:flex-col ${
        overflowHidden ? 'overflow-hidden' : 'overflow-visible'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {collapsed ? <BrandMark /> : <BrandWordmark />}
        <div className="flex items-center gap-2">
          {!collapsed && demoRole && <DemoBadge />}
          {collapsed && demoRole && <DemoDot />}
          {!collapsed && <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />}
        </div>
      </div>

      {/* Collapse toggle when collapsed — show below logo */}
      {collapsed && (
        <div className="mt-3 flex justify-center">
          <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
      )}

      {/* Workspace badge */}
      <div className={`mt-5 mx-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div className="relative group flex h-9 w-9 items-center justify-center rounded-input bg-primary/10 text-primary">
            <WorkspaceIcon size={16} className="text-accent" />
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-input bg-primary px-3 py-1.5 text-xs font-extrabold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {workspaceLabel}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-input bg-primary/10 px-3 py-2.5 text-xs font-extrabold uppercase text-primary">
            <WorkspaceIcon size={15} className="text-accent" />
            {workspaceLabel}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className={`mx-3 my-4 h-px bg-[#ded7cd] ${collapsed ? 'mx-2' : ''}`} />

      {/* Nav */}
      <nav className={`flex flex-1 flex-col gap-1 ${collapsed ? 'px-[10px]' : 'px-3'}`}>
        {nav.map((item) => (
          <SidebarNavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className={`mt-4 pt-4 border-t border-[#ded7cd] ${collapsed ? 'px-[10px]' : 'px-3'}`}>
        {demoRole ? (
          <SidebarFooterBtn
            icon={LogOut}
            label="Exit demo"
            onClick={onExit}
            variant="demo"
            collapsed={collapsed}
          />
        ) : (
          <SidebarFooterBtn
            icon={LogOut}
            label="Logout"
            onClick={onLogout}
            collapsed={collapsed}
          />
        )}
      </div>
    </motion.aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile nav link
// ---------------------------------------------------------------------------

function MobileNavLink({ item }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  function handleClick(e) {
    if (item.href.includes('#progress') && pathname === '/student/dashboard') {
      e.preventDefault();
      scrollToProgress();
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-1 rounded-input px-2 py-2 text-[11px] font-extrabold transition-colors ${
        active ? 'bg-primary text-white' : 'text-muted hover:bg-white/80 hover:text-primary'
      }`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// StudentShell
// ---------------------------------------------------------------------------

export function StudentShell({ children, max = 'max-w-7xl', contentClassName = '' }) {
  const logout = useLogout();
  const router = useRouter();
  const demoRole = useDemoMode();

  function handleExit() {
    exitDemoMode();
    router.push('/');
  }

  return (
    <main className="min-h-screen bg-background pb-24 lg:pb-0">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(45,106,79,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="flex min-h-screen max-w-[1500px] mx-auto">
        <Sidebar
          nav={studentNav}
          workspaceLabel="Student workspace"
          workspaceIcon={GraduationCap}
          onLogout={logout}
          demoRole={demoRole}
          onExit={handleExit}
        />

        <section className={`flex-1 min-w-0 ${contentClassName}`}>
          <div className={`mx-auto ${max} px-5 py-6 sm:px-8 lg:px-10`}>
            {/* Mobile header */}
            <header className="mb-6 flex items-center justify-between gap-4 lg:hidden">
              <div className="flex items-center gap-2">
                <BrandWordmark />
                {demoRole && <DemoBadge />}
              </div>
              {demoRole ? (
                <button
                  type="button"
                  onClick={handleExit}
                  className="inline-flex h-9 items-center gap-1.5 rounded-badge border border-accent/40 bg-accent/10 px-3 text-xs font-extrabold text-primary transition-colors hover:bg-accent/20"
                >
                  <LogOut size={13} />
                  Exit demo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-9 items-center gap-1.5 rounded-badge border border-[#ded7cd] bg-white/70 px-3 text-xs font-extrabold text-primary shadow-card backdrop-blur-xl"
                >
                  <LogOut size={13} />
                  Logout
                </button>
              )}
            </header>
            {children}
          </div>
        </section>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-input border border-[#ded7cd] bg-white/88 p-2 shadow-[0_18px_60px_rgba(45,37,24,0.18)] backdrop-blur-2xl lg:hidden">
        {studentNav.map((item) => <MobileNavLink key={item.href} item={item} />)}
      </nav>
    </main>
  );
}

// ---------------------------------------------------------------------------
// InstructorShell
// ---------------------------------------------------------------------------

export function InstructorShell({ children, eyebrow = 'Instructor intelligence', max = 'max-w-7xl' }) {
  const logout = useLogout();
  const router = useRouter();
  const demoRole = useDemoMode();

  function handleExit() {
    exitDemoMode();
    router.push('/');
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(rgba(45,106,79,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(45,106,79,0.045)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="flex min-h-screen">
        <Sidebar
          nav={instructorNav}
          workspaceLabel="Instructor intelligence"
          workspaceIcon={Radar}
          onLogout={logout}
          demoRole={demoRole}
          onExit={handleExit}
        />

        <section className="flex-1 min-w-0">
          {/* Desktop page header strip */}
          <div className={`hidden mx-auto ${max} px-5 pt-6 sm:px-8 lg:flex lg:items-center lg:gap-3 lg:px-10`}>
            <BrandWordmark />
            <span className="text-[#ded7cd]">·</span>
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-muted">
              <Radar size={12} className="text-accent" />
              {eyebrow}
            </div>
            {demoRole && <DemoBadge />}
          </div>

          {/* Mobile header */}
          <div className={`mx-auto ${max} px-5 pt-6 sm:px-8 lg:px-10`}>
            <header className="flex items-center justify-between gap-4 border-b border-[#ded7cd] pb-5 lg:hidden">
              <div className="flex items-center gap-3">
                <BrandWordmark />
                {demoRole && <DemoBadge />}
              </div>
              {demoRole ? (
                <button
                  type="button"
                  onClick={handleExit}
                  className="inline-flex h-9 items-center gap-1.5 rounded-badge border border-accent/40 bg-accent/10 px-3 text-xs font-extrabold text-primary"
                >
                  <LogOut size={13} />
                  Exit demo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-9 items-center gap-1.5 rounded-badge border border-[#ded7cd] bg-white/70 px-3 text-xs font-extrabold text-primary shadow-card backdrop-blur-xl"
                >
                  <LogOut size={13} />
                  Logout
                </button>
              )}
            </header>

            <div className="lg:pt-4">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

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
        {Array.from({ length: rows }).map((_, i) => <SkeletonBlock key={i} className="h-36" />)}
      </div>
      <SkeletonBlock className="mt-6 h-80" />
    </Shell>
  );
}
