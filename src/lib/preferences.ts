import type { UserPreferences, ReferenceCurrency, Currency, BudgetType } from './types';
import { DEFAULT_PREFERENCES } from './types';

const STORAGE_KEY = 'budget-preferences';

export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(stored);

    // Migration: if lastUsedAccount is a string, convert to per-budget object
    if (typeof parsed.lastUsedAccount === 'string') {
      parsed.lastUsedAccount = {
        personal: parsed.lastUsedAccount,
        business: '',
      };
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  const current = getPreferences();
  const updated = { ...current, ...preferences };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }

  return updated;
}

export function getReferenceCurrency(): ReferenceCurrency {
  return getPreferences().referenceCurrency;
}

export function setReferenceCurrency(currency: ReferenceCurrency): void {
  savePreferences({ referenceCurrency: currency });
}

export function getLastUsedCurrency(): Currency {
  return getPreferences().lastUsedCurrency;
}

export function setLastUsedCurrency(currency: Currency): void {
  savePreferences({ lastUsedCurrency: currency });
}

export function getBudgetMode(): BudgetType {
  return getPreferences().budgetMode;
}

export function setBudgetMode(mode: BudgetType): void {
  savePreferences({ budgetMode: mode });
}

export function getLastUsedAccount(budget?: BudgetType): string {
  const prefs = getPreferences();
  const mode = budget ?? prefs.budgetMode;
  return prefs.lastUsedAccount[mode];
}

export function setLastUsedAccount(account: string, budget?: BudgetType): void {
  const prefs = getPreferences();
  const mode = budget ?? prefs.budgetMode;
  savePreferences({
    lastUsedAccount: {
      ...prefs.lastUsedAccount,
      [mode]: account,
    },
  });
}
