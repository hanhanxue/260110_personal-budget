import TransactionForm from '@/components/TransactionForm';
import {
  fetchSchema,
  getUniqueVendors,
  getUniqueAccounts,
  getUniqueTags,
} from '@/lib/google-sheets';

async function getData() {
  const [schema, vendors, accounts, tags] = await Promise.all([
    fetchSchema(),
    getUniqueVendors(),
    getUniqueAccounts(),
    getUniqueTags(),
  ]);

  return { schema, vendors, accounts, tags };
}

export default async function TransactionFormWrapper() {
  const { schema, vendors, accounts, tags } = await getData();

  return (
    <TransactionForm
      schema={schema}
      vendors={vendors}
      accounts={accounts}
      tags={tags}
    />
  );
}
