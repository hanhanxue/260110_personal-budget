'use client';

import { useState, useEffect } from 'react';
import type { BudgetType } from '@/lib/types';
import { getBudgetMode, setBudgetMode } from '@/lib/preferences';

export default function BudgetToggle() {
  const [mode, setMode] = useState<BudgetType>('personal');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMode(getBudgetMode());
  }, []);

  const toggle = () => {
    const next: BudgetType = mode === 'personal' ? 'business' : 'personal';
    setMode(next);
    setBudgetMode(next);
    window.dispatchEvent(new CustomEvent('budgetModeChanged', { detail: { mode: next } }));
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
      style={
        mode === 'personal'
          ? { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
          : { backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
      }
      aria-label={`Switch to ${mode === 'personal' ? 'business' : 'personal'} budget`}
    >
      {mode === 'personal' ? 'Personal' : 'Business'}
    </button>
  );
}
