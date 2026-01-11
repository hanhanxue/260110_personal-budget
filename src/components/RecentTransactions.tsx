'use client';

import { useState, useEffect } from 'react';
import type { Transaction, ReferenceCurrency } from '@/lib/types';
import { CURRENCY_SYMBOLS } from '@/lib/types';
import { getReferenceCurrency } from '@/lib/preferences';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

function formatAmount(
  transaction: Transaction,
  referenceCurrency: ReferenceCurrency
): string {
  const amount =
    referenceCurrency === 'CAD' ? transaction.cadAmount : transaction.usdAmount;
  const symbol = CURRENCY_SYMBOLS[referenceCurrency];
  return `${symbol}${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

export default function RecentTransactions({
  transactions,
  onEdit,
  onDelete,
}: RecentTransactionsProps) {
  const [referenceCurrency, setReferenceCurrency] =
    useState<ReferenceCurrency>('CAD');
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReferenceCurrency(getReferenceCurrency());

    // Listen for storage changes (currency toggle)
    const handleStorage = () => {
      setReferenceCurrency(getReferenceCurrency());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleDelete = async (transaction: Transaction) => {
    if (!transaction.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions?id=${transaction.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        onDelete?.(transaction);
      } else {
        alert(data.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
    } finally {
      setIsDeleting(false);
      setConfirmDelete(null);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          >
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {transaction.lineItem}
                </span>
                {transaction.vendor && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @ {transaction.vendor}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {transaction.table} &gt; {transaction.subcategory}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{formatDate(transaction.date)}</span>
                <span>&bull;</span>
                <span>{transaction.account}</span>
                {transaction.tag && (
                  <>
                    <span>&bull;</span>
                    <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {transaction.tag}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatAmount(transaction, referenceCurrency)}
                </div>
                {transaction.currency !== referenceCurrency && (
                  <div className="text-xs text-gray-400">
                    {CURRENCY_SYMBOLS[transaction.currency]}
                    {transaction.amount.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            {onEdit && (
              <button
                onClick={() => onEdit(transaction)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <>
                {confirmDelete === transaction.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      Delete?
                    </span>
                    <button
                      onClick={() => handleDelete(transaction)}
                      disabled={isDeleting}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      disabled={isDeleting}
                      className="text-sm text-gray-500 hover:underline"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(transaction.id || null)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
            {transaction.receiptUrl && (
              <a
                href={transaction.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:underline ml-auto"
              >
                View Receipt
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
