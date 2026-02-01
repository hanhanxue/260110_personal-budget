'use client';

import { useState, useEffect, useCallback } from 'react';
import TransactionForm from '@/components/TransactionForm';
import type { Schema, BudgetType } from '@/lib/types';
import { getBudgetMode } from '@/lib/preferences';

const emptySchema: Schema = { tables: [], subcategories: {}, lineItems: {} };

export default function TransactionFormWrapper() {
  const [budgetMode, setBudgetMode] = useState<BudgetType>('personal');
  const [schema, setSchema] = useState<Schema>(emptySchema);
  const [vendors, setVendors] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (mode: BudgetType) => {
    setIsLoading(true);
    try {
      const [schemaRes, vendorsRes, accountsRes, tagsRes] = await Promise.all([
        fetch(`/api/${mode}/schema`).then((r) => r.json()),
        fetch(`/api/${mode}/transactions/vendors`).then((r) => r.json()),
        fetch(`/api/${mode}/transactions/accounts`).then((r) => r.json()),
        fetch(`/api/${mode}/transactions/tags`).then((r) => r.json()),
      ]);

      setSchema(schemaRes.success ? schemaRes.data : emptySchema);
      setVendors(vendorsRes.success ? vendorsRes.data.values : []);
      setAccounts(accountsRes.success ? accountsRes.data.values : []);
      setTags(tagsRes.success ? tagsRes.data.values : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSchema(emptySchema);
      setVendors([]);
      setAccounts([]);
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const mode = getBudgetMode();
    setBudgetMode(mode);
    fetchData(mode);
  }, [fetchData]);

  useEffect(() => {
    const handleBudgetChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: BudgetType }>;
      const newMode = customEvent.detail.mode;
      setBudgetMode(newMode);
      fetchData(newMode);
    };

    window.addEventListener('budgetModeChanged', handleBudgetChange);
    return () => window.removeEventListener('budgetModeChanged', handleBudgetChange);
  }, [fetchData]);

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <TransactionForm
      budgetType={budgetMode}
      schema={schema}
      vendors={vendors}
      accounts={accounts}
      tags={tags}
    />
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
