'use client';

import { useState, useEffect } from 'react';
import type { Transaction, ReferenceCurrency, BudgetType } from '@/lib/types';
import { isPersonalTransaction, isBusinessTransaction, CURRENCY_SYMBOLS } from '@/lib/types';
import { getReferenceCurrency } from '@/lib/preferences';

interface RecentTransactionsProps {
  budgetType: BudgetType;
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
  return `${amount.toFixed(2)} ${referenceCurrency}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

export default function RecentTransactions({
  budgetType,
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

    const handleStorage = () => {
      setReferenceCurrency(getReferenceCurrency());
    };

    const handleCurrencyChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.currency) {
        setReferenceCurrency(customEvent.detail.currency);
      } else {
        setReferenceCurrency(getReferenceCurrency());
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('currencyChanged', handleCurrencyChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('currencyChanged', handleCurrencyChange);
    };
  }, []);

  const handleDelete = async (transaction: Transaction) => {
    if (!transaction.id) return;

    setIsDeleting(true);
    try {
      const password = sessionStorage.getItem('budget-password') || '';

      const response = await fetch(`/api/${budgetType}/transactions?id=${transaction.id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-password': password,
        },
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
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                <span>{formatDate(transaction.transactionDate)}</span>
                <span>&bull;</span>
                <span>{transaction.account}</span>
                {/* Budget-specific badges */}
                {isPersonalTransaction(transaction) && transaction.distribute !== 'one-time' && (
                  <>
                    <span>&bull;</span>
                    <span className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-1.5 py-0.5 rounded">
                      {transaction.distribute}
                    </span>
                  </>
                )}
                {isBusinessTransaction(transaction) && transaction.capitalExpense && (
                  <>
                    <span>&bull;</span>
                    <span className="bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded">
                      Capital
                    </span>
                  </>
                )}
                {isBusinessTransaction(transaction) && transaction.gstHstPaid != null && transaction.gstHstPaid > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 rounded">
                      GST ${transaction.gstHstPaid.toFixed(2)}
                    </span>
                  </>
                )}
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
                    {transaction.amount.toFixed(2)} {transaction.currency}
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
