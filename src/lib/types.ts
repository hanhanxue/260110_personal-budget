// Budget types
export type BudgetType = 'personal' | 'business';

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

// Distribution types (personal budget only)
export type Distribute = 'one-time' | 'monthly' | 'quarterly' | 'yearly';

export const DISTRIBUTE_OPTIONS: Distribute[] = ['one-time', 'monthly', 'quarterly', 'yearly'];

// Transaction types
interface BaseTransaction {
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
  tag?: string;
  submittedAt: string; // ISO timestamp when transaction was submitted
}

export interface PersonalTransaction extends BaseTransaction {
  distribute: Distribute;
}

export interface BusinessTransaction extends BaseTransaction {
  gstHstPaid?: number;
  capitalExpense: boolean;
}

export type Transaction = PersonalTransaction | BusinessTransaction;

// Type guards
export function isPersonalTransaction(t: Transaction): t is PersonalTransaction {
  return 'distribute' in t;
}

export function isBusinessTransaction(t: Transaction): t is BusinessTransaction {
  return 'capitalExpense' in t;
}

// Transaction input types
interface BaseTransactionInput {
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
  tag?: string;
  submittedAt: string;
}

export interface PersonalTransactionInput extends BaseTransactionInput {
  distribute: Distribute;
}

export interface BusinessTransactionInput extends BaseTransactionInput {
  gstHstPaid?: number;
  capitalExpense: boolean;
}

export type TransactionInput = PersonalTransactionInput | BusinessTransactionInput;

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

// Default accounts per budget type
export const DEFAULT_PERSONAL_ACCOUNTS = ['RBC Visa', 'RBC Chequing', 'Chase Chequing'];
export const DEFAULT_BUSINESS_ACCOUNTS = ['RBC Business Visa', 'RBC Business Chequing'];

// User preferences
export interface UserPreferences {
  referenceCurrency: ReferenceCurrency;
  lastUsedCurrency: Currency;
  lastUsedAccount: { personal: string; business: string };
  budgetMode: BudgetType;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  referenceCurrency: 'CAD',
  lastUsedCurrency: 'CAD',
  lastUsedAccount: { personal: '', business: '' },
  budgetMode: 'personal',
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
