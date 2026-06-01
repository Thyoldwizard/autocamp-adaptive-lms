'use client';

import { motion } from 'framer-motion';
import { CARD_V } from '@/lib/constants';

export function MetricCard({ icon: Icon, label, value, copy, variants = CARD_V }) {
  return (
    <motion.div
      variants={variants}
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
      {copy && <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>}
    </motion.div>
  );
}
