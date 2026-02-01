import Link from 'next/link';
import CurrencyToggle from '@/components/CurrencyToggle';
import BudgetToggle from '@/components/BudgetToggle';
import TransactionsListWrapper from './TransactionsListWrapper';

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Back to form"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Transactions
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <BudgetToggle />
            <CurrencyToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <TransactionsListWrapper />
      </main>
    </div>
  );
}
