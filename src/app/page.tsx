import { Suspense } from 'react';
import Link from 'next/link';
import CurrencyToggle from '@/components/CurrencyToggle';
import TransactionFormWrapper from './TransactionFormWrapper';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Budget
          </h1>
          <div className="flex items-center gap-3">
            <CurrencyToggle />
            <Link
              href="/transactions"
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label="View transactions"
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
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <Suspense fallback={<FormSkeleton />}>
          <TransactionFormWrapper />
        </Suspense>
      </main>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-1">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded-lg" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded-lg" />
        </div>
      ))}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded-lg" />
        </div>
        <div className="space-y-1">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded-lg" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded-lg" />
        </div>
      ))}
      <div className="h-12 bg-gray-200 rounded-lg mt-6" />
    </div>
  );
}
