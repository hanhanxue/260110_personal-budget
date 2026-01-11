// Schema types
export interface SchemaRow {
  table: string;
  subcategory: string;
  lineItem: string;
  active: boolean;
}

export interface Schema {
  tables: string[];
  subcategories: Record<string, string[]>;
  lineItems: Record<string, string[]>;
}

// Currency types
export type Currency = 'CAD' | 'USD' | 'CNY' | 'JPY' | 'GBP';
export type ReferenceCurrency = 'CAD' | 'USD';

export const CURRENCIES: Currency[] = ['CAD', 'USD', 'CNY', 'JPY', 'GBP'];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CAD: 'C$',
  USD: '$',
  CNY: '¥',
  JPY: '¥',
  GBP: '£',
};

// Distribution types
export type Distribute = 'one-time' | 'per month' | 'quarterly' | 'semi-annual';

export const DISTRIBUTE_OPTIONS: Distribute[] = ['one-time', 'per month', 'quarterly', 'semi-annual'];

// Transaction types
export interface Transaction {
  id?: string;
  transactionDate: string; // YYYY-MM-DD
  table: string;
  subcategory: string;
  lineItem: string;
  amount: number;
  currency: Currency;
  cadAmount: number;
  cadRate: number;
  usdAmount: number;
  usdRate: number;
  vendor?: string;
  note?: string;
  receiptUrl?: string;
  account: string;
  distribute: Distribute;
  tag?: string;
  submittedAt: string; // ISO timestamp when transaction was submitted
}

export interface TransactionInput {
  transactionDate: string;
  table: string;
  subcategory: string;
  lineItem: string;
  amount: number;
  currency: Currency;
  cadAmount: number;
  cadRate: number;
  usdAmount: number;
  usdRate: number;
  vendor?: string;
  note?: string;
  receiptUrl?: string;
  account: string;
  distribute: Distribute;
  tag?: string;
  submittedAt: string;
}

// Exchange rate types
export interface ExchangeRates {
  CAD: number;
  USD: number;
}

export interface ExchangeRateResponse {
  from: Currency;
  date: string;
  rates: ExchangeRates;
}

// User preferences
export interface UserPreferences {
  referenceCurrency: ReferenceCurrency;
  lastUsedCurrency: Currency;
  lastUsedAccount: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  referenceCurrency: 'CAD',
  lastUsedCurrency: 'CAD',
  lastUsedAccount: '',
};

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TransactionsListResponse {
  transactions: Transaction[];
  total: number;
}

export interface AutocompleteResponse {
  values: string[];
}
