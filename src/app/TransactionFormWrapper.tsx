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
  // Check if required environment variables are available
  // During build time on Vercel, these might not be available
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    // Return empty data during build if env vars are missing
    // This prevents build failures while still allowing the page to render
    console.warn('Google Sheets credentials not available, returning empty data');
    return {
      schema: { tables: [], subcategories: {}, lineItems: {} },
      vendors: [],
      accounts: [],
      tags: [],
    };
  }

  try {
    const [schema, vendors, accounts, tags] = await Promise.all([
      fetchSchema(),
      getUniqueVendors(),
      getUniqueAccounts(),
      getUniqueTags(),
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
