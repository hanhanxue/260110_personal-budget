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
  // Check if credentials are missing (but allow in development)
  const hasCredentials = process.env.GOOGLE_SHEETS_ID && 
                         process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
                         process.env.GOOGLE_PRIVATE_KEY;
  
  // Only return empty data during actual build phase, not in development
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildPhase && !hasCredentials) {
    // Return empty data during build if credentials are missing
    return {
      schema: { tables: [], subcategories: {}, lineItems: {} },
      vendors: [],
      accounts: [],
      tags: [],
    };
  }

  // Try to fetch data, but handle errors gracefully
  try {
    const [schema, vendors, accounts, tags] = await Promise.all([
      fetchSchema().catch((err) => {
        console.error('Error fetching schema:', err);
        return { tables: [], subcategories: {}, lineItems: {} };
      }),
      getUniqueVendors().catch((err) => {
        console.error('Error fetching vendors:', err);
        return [];
      }),
      getUniqueAccounts().catch((err) => {
        console.error('Error fetching accounts:', err);
        return [];
      }),
      getUniqueTags().catch((err) => {
        console.error('Error fetching tags:', err);
        return [];
      }),
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
