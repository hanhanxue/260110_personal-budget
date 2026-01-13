'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CascadingSelect, { LineItemSelect } from './CascadingSelect';
import type {
  Schema,
  Currency,
  Distribute,
  TransactionInput,
  ExchangeRates,
  Defaults,
} from '@/lib/types';
import { CURRENCIES, CURRENCY_SYMBOLS, DISTRIBUTE_OPTIONS } from '@/lib/types';
import {
  getLastUsedCurrency,
  setLastUsedCurrency,
  getLastUsedAccount,
  setLastUsedAccount,
} from '@/lib/preferences';

interface TransactionFormProps {
  schema: Schema;
  vendors: string[];
  accounts: string[];
  tags: string[];
  defaults: Defaults;
  onSuccess?: () => void;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const inputStyle = { color: '#000000', backgroundColor: '#ffffff' };

export default function TransactionForm({
  schema,
  vendors,
  accounts,
  tags,
  defaults,
  onSuccess,
}: TransactionFormProps) {
  // Initialize with current date
  const today = new Date();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [day, setDay] = useState(String(today.getDate()).padStart(2, '0'));
  
  // Computed transactionDate in YYYY-MM-DD format, ensuring it's always valid
  const transactionDate = useMemo(() => {
    const y = year || String(today.getFullYear());
    const m = month || String(today.getMonth() + 1).padStart(2, '0');
    const d = day || String(today.getDate()).padStart(2, '0');
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }, [year, month, day, today]);
  const [table, setTable] = useState('Discretionary');
  const [subcategory, setSubcategory] = useState('Dining');
  const [lineItem, setLineItem] = useState('Restaurants');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [cadAmount, setCadAmount] = useState('');
  const [cadRate, setCadRate] = useState('1');
  const [usdAmount, setUsdAmount] = useState('');
  const [usdRate, setUsdRate] = useState('1');
  const [vendor, setVendor] = useState('');
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [account, setAccount] = useState('RBC Visa');
  const [distribute, setDistribute] = useState<Distribute>('one-time');
  const [tag, setTag] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [rateError, setRateError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [manualRates, setManualRates] = useState(false);

  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrency(getLastUsedCurrency());
    const savedAccount = getLastUsedAccount();
    // Use saved account if valid, otherwise use first available account or default
    const defaultAccount = savedAccount && accounts.includes(savedAccount) 
      ? savedAccount 
      : accounts.length > 0 
        ? accounts[0] 
        : 'RBC Visa';
    setAccount(defaultAccount);
    
    // Ensure defaults are valid when schema loads
    if (schema.tables.length > 0 && !schema.tables.includes(table)) {
      // If default table doesn't exist, use first available
      setTable(schema.tables[0]);
      setSubcategory('');
      setLineItem('');
    } else if (schema.tables.includes('Discretionary')) {
      // If Discretionary exists, ensure subcategory and lineItem are valid
      const discretionarySubcats = schema.subcategories['Discretionary'] || [];
      if (table === 'Discretionary' && subcategory === 'Dining' && !discretionarySubcats.includes('Dining')) {
        setSubcategory(discretionarySubcats[0] || '');
        setLineItem('');
      } else if (table === 'Discretionary' && subcategory === 'Dining') {
        const lineItemKey = 'Discretionary|Dining';
        const diningLineItems = schema.lineItems[lineItemKey] || [];
        if (lineItem === 'Restaurants' && !diningLineItems.includes('Restaurants')) {
          setLineItem(diningLineItems[0] || '');
        }
      }
    }
  }, [schema, accounts]);

  // Apply defaults when lineItem changes
  useEffect(() => {
    if (lineItem && defaults[lineItem]) {
      const lineItemDefaults = defaults[lineItem];
      
      // Auto-fill vendor if default exists (only if currently empty)
      if (lineItemDefaults.vendor && !vendor) {
        setVendor(lineItemDefaults.vendor);
      }
      
      // Auto-fill tag if default exists (only if currently empty)
      if (lineItemDefaults.tag && !tag) {
        setTag(lineItemDefaults.tag);
      }
      
      // Auto-fill account if default exists (only if currently empty)
      if (lineItemDefaults.account && !account) {
        setAccount(lineItemDefaults.account);
        setLastUsedAccount(lineItemDefaults.account);
      }
      
      // Auto-fill note if default exists (only if currently empty)
      if (lineItemDefaults.note && !note) {
        setNote(lineItemDefaults.note);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineItem]); // Only re-run when lineItem changes

  const fetchRates = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    // Validate date format before making API call
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(transactionDate)) {
      console.error('Invalid date format for rate fetch:', transactionDate);
      setRateError('Invalid date format. Please check year, month, and day.');
      setManualRates(true);
      return;
    }

    if (currency === 'CAD') {
      setCadAmount(amount);
      setCadRate('1');
    }

    if (currency === 'USD') {
      setUsdAmount(amount);
      setUsdRate('1');
    }

    setIsFetchingRates(true);
    setRateError('');

    try {
      const response = await fetch(
        `/api/exchange-rate?from=${currency}&date=${transactionDate}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch rates');
      }

      const rates: ExchangeRates = data.data.rates;

      const cadConverted = (numAmount * rates.CAD).toFixed(2);
      const usdConverted = (numAmount * rates.USD).toFixed(2);

      setCadAmount(cadConverted);
      setCadRate(rates.CAD.toFixed(6));
      setUsdAmount(usdConverted);
      setUsdRate(rates.USD.toFixed(6));
      setManualRates(false);
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      setRateError('Could not fetch rates. Enter manually below.');
      setManualRates(true);
    } finally {
      setIsFetchingRates(false);
    }
  }, [amount, currency, transactionDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        fetchRates();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, currency, transactionDate, fetchRates]);

  const handleCadAmountChange = (value: string) => {
    setCadAmount(value);
    const numAmount = parseFloat(amount);
    const numCad = parseFloat(value);
    if (numAmount && numCad) {
      setCadRate((numCad / numAmount).toFixed(6));
    }
  };

  const handleUsdAmountChange = (value: string) => {
    setUsdAmount(value);
    const numAmount = parseFloat(amount);
    const numUsd = parseFloat(value);
    if (numAmount && numUsd) {
      setUsdRate((numUsd / numAmount).toFixed(6));
    }
  };

  const handleReceiptUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get password from sessionStorage for auth
      const password = sessionStorage.getItem('budget-password') || '';
      
      const response = await fetch('/api/upload', {
        headers: {
          'x-auth-password': password,
        },
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to upload');
      }

      setReceiptUrl(data.data.url);
    } catch (error) {
      console.error('Failed to upload receipt:', error);
      alert('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredVendors = vendors.filter((v) =>
    v.toLowerCase().includes(vendor.toLowerCase())
  );
  const filteredTags = tags.filter((t) =>
    t.toLowerCase().includes(tag.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!table || !subcategory || !lineItem) {
      setSubmitError('Please select table, subcategory, and line item');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setSubmitError('Please enter a valid amount');
      return;
    }

    const numCadAmount = parseFloat(cadAmount);
    const numCadRate = parseFloat(cadRate);
    const numUsdAmount = parseFloat(usdAmount);
    const numUsdRate = parseFloat(usdRate);

    if (!numCadAmount || !numCadRate || !numUsdAmount || !numUsdRate) {
      setSubmitError('Please enter valid converted amounts');
      return;
    }

    if (!account) {
      setSubmitError('Please select or enter an account');
      return;
    }

    setIsSubmitting(true);

    const transaction: TransactionInput = {
      transactionDate,
      table,
      subcategory,
      lineItem,
      amount: numAmount,
      currency,
      cadAmount: numCadAmount,
      cadRate: numCadRate,
      usdAmount: numUsdAmount,
      usdRate: numUsdRate,
      vendor: vendor || undefined,
      note: note || undefined,
      receiptUrl: receiptUrl || undefined,
      account,
      distribute,
      tag: tag || undefined,
      submittedAt: new Date().toISOString(),
    };

    try {
      // Get password from sessionStorage for auth
      const password = sessionStorage.getItem('budget-password') || '';
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-password': password,
        },
        body: JSON.stringify(transaction),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      setLastUsedCurrency(currency);
      setLastUsedAccount(account);

      // Reset date to current day
      const resetDate = new Date();
      setYear(String(resetDate.getFullYear()));
      setMonth(String(resetDate.getMonth() + 1).padStart(2, '0'));
      setDay(String(resetDate.getDate()).padStart(2, '0'));
      setTable('Discretionary');
      setSubcategory('Dining');
      setLineItem('Restaurants');
      setAmount('');
      setCadAmount('');
      setCadRate('1');
      setUsdAmount('');
      setUsdRate('1');
      setVendor('');
      setNote('');
      setReceiptUrl('');
      setTag('');
      setDistribute('one-time');
      // Note: account is preserved via setLastUsedAccount above, so it will be set from preferences

      setSubmitSuccess(true);
      onSuccess?.();

      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to save transaction'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitSuccess && (
        <div className="p-4 bg-green-100 text-green-800 rounded-lg">
          Transaction saved successfully!
        </div>
      )}

      {submitError && (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 form-group">
          <label htmlFor="amount" className="form-label">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {CURRENCY_SYMBOLS[currency]}
            </span>
            <input
              type="number"
              id="amount"
              inputMode="decimal"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => {
                // Only allow numbers and decimal point
                const value = e.target.value;
                const numericValue = value.replace(/[^0-9.]/g, '');
                // Prevent multiple decimal points
                const parts = numericValue.split('.');
                const filteredValue = parts.length > 2 
                  ? parts[0] + '.' + parts.slice(1).join('')
                  : numericValue;
                setAmount(filteredValue);
              }}
              className="form-input pl-8"
              style={inputStyle}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="currency" className="form-label">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="form-input"
            style={inputStyle}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="distribute" className="form-label">
            Distribute
          </label>
          <select
            id="distribute"
            value={distribute}
            onChange={(e) => setDistribute(e.target.value as Distribute)}
            className="form-input"
            style={inputStyle}
          >
            {DISTRIBUTE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'one-time' ? 'One-time' : 
                 option === 'per month' ? 'Per month (÷12)' :
                 option === 'quarterly' ? 'Quarterly (÷4)' :
                 'Semi-annual (÷2)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          Transaction Date *
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="year" className="text-xs text-gray-500 block mb-1">
              Year (YYYY)
            </label>
            <input
              type="number"
              id="year"
              inputMode="numeric"
              pattern="[0-9]*"
              value={year}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                if (value.length <= 4) {
                  setYear(value); // Allow empty string while typing
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (!value || parseInt(value) < 2000 || parseInt(value) > 2100) {
                  setYear(String(today.getFullYear()));
                } else {
                  setYear(value.padStart(4, '0'));
                }
              }}
              className="form-input"
              style={inputStyle}
              placeholder="2026"
              min="2000"
              max="2100"
              required
            />
          </div>
          <div>
            <label htmlFor="month" className="text-xs text-gray-500 block mb-1">
              Month (MM)
            </label>
            <input
              type="number"
              id="month"
              inputMode="numeric"
              pattern="[0-9]*"
              value={month}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                if (value.length <= 2) {
                  setMonth(value); // Allow empty string while typing
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                let monthValue = parseInt(value) || today.getMonth() + 1;
                if (monthValue < 1) monthValue = 1;
                if (monthValue > 12) monthValue = 12;
                setMonth(String(monthValue).padStart(2, '0'));
              }}
              className="form-input"
              style={inputStyle}
              placeholder="01"
              min="1"
              max="12"
              required
            />
          </div>
          <div>
            <label htmlFor="day" className="text-xs text-gray-500 block mb-1">
              Day (DD)
            </label>
            <input
              type="number"
              id="day"
              inputMode="numeric"
              pattern="[0-9]*"
              value={day}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                if (value.length <= 2) {
                  setDay(value); // Allow empty string while typing
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const monthValue = parseInt(month) || today.getMonth() + 1;
                const yearValue = parseInt(year) || today.getFullYear();
                const daysInMonth = new Date(yearValue, monthValue, 0).getDate();
                let dayValue = parseInt(value) || today.getDate();
                if (dayValue < 1) dayValue = 1;
                if (dayValue > daysInMonth) dayValue = daysInMonth;
                setDay(String(dayValue).padStart(2, '0'));
              }}
              className="form-input"
              style={inputStyle}
              placeholder="11"
              min="1"
              max="31"
              required
            />
          </div>
        </div>
      </div>

      <CascadingSelect
        schema={schema}
        table={table}
        subcategory={subcategory}
        lineItem={lineItem}
        onTableChange={setTable}
        onSubcategoryChange={setSubcategory}
        onLineItemChange={setLineItem}
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-2 gap-3">
        <LineItemSelect
          schema={schema}
          table={table}
          subcategory={subcategory}
          lineItem={lineItem}
          onLineItemChange={setLineItem}
          disabled={isSubmitting}
        />

        <div className="form-group">
          <label htmlFor="account" className="form-label">
            Account *
          </label>
          <select
            id="account"
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
              setLastUsedAccount(e.target.value);
            }}
            className="form-input"
            style={inputStyle}
            required
          >
            <option value="">Select account...</option>
            {accounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Converted Amounts
            </span>
            {isFetchingRates && (
              <span className="text-xs text-gray-500">Fetching rates...</span>
            )}
          </div>

          {rateError && (
            <p className="text-sm text-amber-600">{rateError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">CAD Amount</label>
              <input
                type="number"
                value={cadAmount}
                onChange={(e) => handleCadAmountChange(e.target.value)}
                className="form-input mt-1"
                style={inputStyle}
                step="0.01"
                min="0"
                disabled={!manualRates && currency === 'CAD'}
                required
              />
              <span className="text-xs text-gray-400">Rate: {cadRate}</span>
            </div>
            <div>
              <label className="text-xs text-gray-500">USD Amount</label>
              <input
                type="number"
                value={usdAmount}
                onChange={(e) => handleUsdAmountChange(e.target.value)}
                className="form-input mt-1"
                style={inputStyle}
                step="0.01"
                min="0"
                disabled={!manualRates && currency === 'USD'}
                required
              />
              <span className="text-xs text-gray-400">Rate: {usdRate}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="form-group relative">
          <label htmlFor="vendor" className="form-label">
            Vendor
          </label>
          <input
            type="text"
            id="vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            onFocus={() => setShowVendorSuggestions(true)}
            onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 200)}
            className="form-input"
            style={inputStyle}
            placeholder="Where did you spend?"
            autoComplete="off"
          />
          {showVendorSuggestions && filteredVendors.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredVendors.slice(0, 5).map((v) => (
                <li
                  key={v}
                  onClick={() => {
                    setVendor(v);
                    setShowVendorSuggestions(false);
                  }}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-black"
                >
                  {v}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group relative">
          <label htmlFor="tag" className="form-label">
            Tag
          </label>
          <input
            type="text"
            id="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onFocus={() => setShowTagSuggestions(true)}
            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
            className="form-input"
            style={inputStyle}
            placeholder="Trip name, project, etc."
            autoComplete="off"
          />
          {showTagSuggestions && filteredTags.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredTags.slice(0, 5).map((t) => (
                <li
                  key={t}
                  onClick={() => {
                    setTag(t);
                    setShowTagSuggestions(false);
                  }}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-black"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="note" className="form-label">
          Note
        </label>
        <input
          type="text"
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="form-input"
          style={inputStyle}
          placeholder="Additional context"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Receipt</label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleReceiptUpload}
          accept="image/*"
          className="hidden"
        />
        {receiptUrl ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600">Receipt uploaded</span>
            <button
              type="button"
              onClick={() => setReceiptUrl('')}
              className="text-sm text-red-600 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-secondary"
          >
            {isUploading ? 'Uploading...' : 'Add Receipt Photo'}
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary mt-6"
      >
        {isSubmitting ? 'Saving...' : 'Save Transaction'}
      </button>
    </form>
  );
}
