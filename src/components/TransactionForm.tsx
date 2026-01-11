'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CascadingSelect from './CascadingSelect';
import type {
  Schema,
  Currency,
  Period,
  TransactionInput,
  ExchangeRates,
} from '@/lib/types';
import { CURRENCIES, CURRENCY_SYMBOLS, PERIODS } from '@/lib/types';
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
  onSuccess,
}: TransactionFormProps) {
  const [date, setDate] = useState(formatDate(new Date()));
  const [table, setTable] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [lineItem, setLineItem] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [cadAmount, setCadAmount] = useState('');
  const [cadRate, setCadRate] = useState('1');
  const [usdAmount, setUsdAmount] = useState('');
  const [usdRate, setUsdRate] = useState('1');
  const [vendor, setVendor] = useState('');
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [account, setAccount] = useState('');
  const [period, setPeriod] = useState<Period>('one-time');
  const [distribute, setDistribute] = useState(false);
  const [tag, setTag] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [rateError, setRateError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [manualRates, setManualRates] = useState(false);

  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrency(getLastUsedCurrency());
    const savedAccount = getLastUsedAccount();
    if (savedAccount) setAccount(savedAccount);
  }, []);

  const fetchRates = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

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
        `/api/exchange-rate?from=${currency}&date=${date}`
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
  }, [amount, currency, date]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        fetchRates();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, currency, date, fetchRates]);

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

      const response = await fetch('/api/upload', {
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
  const filteredAccounts = accounts.filter((a) =>
    a.toLowerCase().includes(account.toLowerCase())
  );
  const filteredTags = tags.filter((t) =>
    t.toLowerCase().includes(tag.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!table || !subcategory || !lineItem) {
      setSubmitError('Please select category, subcategory, and line item');
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
      period,
      distribute,
      tag: tag || undefined,
      submittedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      setLastUsedCurrency(currency);
      setLastUsedAccount(account);

      setTable('');
      setSubcategory('');
      setLineItem('');
      setAmount('');
      setCadAmount('');
      setCadRate('1');
      setUsdAmount('');
      setUsdRate('1');
      setVendor('');
      setNote('');
      setReceiptUrl('');
      setTag('');
      setDistribute(false);
      setPeriod('one-time');

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

      <div className="form-group">
        <label htmlFor="date" className="form-label">
          Transaction Date *
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="form-input"
          style={inputStyle}
          required
        />
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

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 form-group">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
        <label htmlFor="account" className="form-label">
          Account *
        </label>
        <input
          type="text"
          id="account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          onFocus={() => setShowAccountSuggestions(true)}
          onBlur={() => setTimeout(() => setShowAccountSuggestions(false), 200)}
          className="form-input"
          style={inputStyle}
          placeholder="Payment method"
          autoComplete="off"
          required
        />
        {showAccountSuggestions && filteredAccounts.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredAccounts.slice(0, 5).map((a) => (
              <li
                key={a}
                onClick={() => {
                  setAccount(a);
                  setShowAccountSuggestions(false);
                }}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-black"
              >
                {a}
              </li>
            ))}
          </ul>
        )}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label htmlFor="period" className="form-label">
            Period
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="form-input"
            style={inputStyle}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group flex items-end">
          <label className="flex items-center gap-2 cursor-pointer py-3">
            <input
              type="checkbox"
              checked={distribute}
              onChange={(e) => setDistribute(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Distribute
            </span>
          </label>
        </div>
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
