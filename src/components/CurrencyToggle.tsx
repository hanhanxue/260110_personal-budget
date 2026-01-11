'use client';

import { useState, useEffect } from 'react';
import type { ReferenceCurrency } from '@/lib/types';
import { getReferenceCurrency, setReferenceCurrency } from '@/lib/preferences';

interface CurrencyToggleProps {
  onChange?: (currency: ReferenceCurrency) => void;
}

export default function CurrencyToggle({ onChange }: CurrencyToggleProps) {
  const [currency, setCurrency] = useState<ReferenceCurrency>('CAD');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrency(getReferenceCurrency());
  }, []);

  const toggle = () => {
    const newCurrency: ReferenceCurrency = currency === 'CAD' ? 'USD' : 'CAD';
    setCurrency(newCurrency);
    setReferenceCurrency(newCurrency);
    onChange?.(newCurrency);
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('currencyChanged', { 
        detail: { currency: newCurrency } 
      }));
    }
  };

  if (!mounted) {
    return (
      <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800
                 rounded-full border border-gray-300 dark:border-gray-600
                 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                 text-sm font-medium"
      aria-label={`Switch to ${currency === 'CAD' ? 'USD' : 'CAD'}`}
    >
      <span
        className={`transition-colors ${
          currency === 'CAD'
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        CAD
      </span>
      <span className="text-gray-400 dark:text-gray-500">↔</span>
      <span
        className={`transition-colors ${
          currency === 'USD'
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        USD
      </span>
    </button>
  );
}
