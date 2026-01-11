import TransactionForm from '@/components/TransactionForm';
import {
  fetchSchema,
  getUniqueVendors,
  getUniqueAccounts,
  getUniqueTags,
} from '@/lib/google-sheets';

// Force dynamic rendering to prevent build-time API calls
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  // Check if we're in a build environment or if credentials are missing
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                       process.env.VERCEL_ENV === undefined ||
                       !process.env.GOOGLE_SHEETS_ID || 
                       !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
                       !process.env.GOOGLE_PRIVATE_KEY;
  
  if (isBuildTime) {
    // Return empty data during build to prevent build failures
    return {
      schema: { tables: [], subcategories: {}, lineItems: {} },
      vendors: [],
      accounts: [],
      tags: [],
    };
  }

  try {
    const [schema, vendors, accounts, tags] = await Promise.all([
      fetchSchema().catch(() => ({ tables: [], subcategories: {}, lineItems: {} })),
      getUniqueVendors().catch(() => []),
      getUniqueAccounts().catch(() => []),
      getUniqueTags().catch(() => []),
    ]);

    return { schema, vendors, accounts, tags };
  } catch (error) {
    console.error('Error fetching data:', error);
    // Return empty data on error to prevent build/runtime failure
    // The form will still render but without autocomplete suggestions
    return {
      schema: { tables: [], subcategories: {}, lineItems: {} },
      vendors: [],
      accounts: [],
      tags: [],
    };
  }
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
