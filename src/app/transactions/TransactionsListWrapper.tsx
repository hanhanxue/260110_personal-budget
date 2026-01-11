'use client';

import { useState, useEffect, useCallback } from 'react';
import RecentTransactions from '@/components/RecentTransactions';
import type { Transaction } from '@/lib/types';

export default function TransactionsListWrapper() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.data.transactions);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = (deleted: Transaction) => {
    setTransactions((prev) => prev.filter((t) => t.id !== deleted.id));
  };

  return (
    <div className="space-y-4">
      {/* Date Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input mt-1"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input mt-1"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {(startDate || endDate) && (
        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Clear filters
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {error}
          <button
            onClick={fetchTransactions}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading transactions...
        </div>
      ) : (
        <RecentTransactions
          transactions={transactions}
          onDelete={handleDelete}
        />
      )}

      {/* Transaction Count */}
      {!isLoading && transactions.length > 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
