import type { UserPreferences, ReferenceCurrency, Currency } from './types';
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

export function getLastUsedAccount(): string {
  return getPreferences().lastUsedAccount;
}

export function setLastUsedAccount(account: string): void {
  savePreferences({ lastUsedAccount: account });
}
