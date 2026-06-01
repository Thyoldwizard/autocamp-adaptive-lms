import { BarChart3, Brain, CheckCircle2 } from 'lucide-react';

// Shared Framer Motion easing curve used across all pages
export const EASE_OUT = [0.16, 1, 0.3, 1];

// Standard card stagger variants
export const CARD_V = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export const CONTAINER_V = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06 } },
};

// Canonical risk-level metadata (label includes "risk" suffix already)
export const RISK = {
  low:      { label: 'Low risk',      cls: 'bg-primary/10 text-primary' },
  medium:   { label: 'Medium risk',   cls: 'bg-accent/20 text-[#9b5f1e]' },
  high:     { label: 'High risk',     cls: 'bg-danger/10 text-danger' },
  critical: { label: 'Critical risk', cls: 'bg-red-100 text-red-700' },
};

// Skill-band metadata (includes icon references)
export const BAND = {
  strong: {
    title: 'Strong',
    copy:  'Skills you can lean on right now.',
    icon:  CheckCircle2,
    cls:   'bg-primary/10 text-primary',
  },
  developing: {
    title: 'Developing',
    copy:  'Useful skills that are becoming reliable.',
    icon:  BarChart3,
    cls:   'bg-accent/20 text-[#9b5f1e]',
  },
  weak: {
    title: 'Needs practice',
    copy:  'Good candidates for check-ins and focused practice.',
    icon:  Brain,
    cls:   'bg-danger/10 text-danger',
  },
};
