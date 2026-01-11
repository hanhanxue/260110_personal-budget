import { google } from 'googleapis';
import type { Schema, SchemaRow, Transaction, TransactionInput, Currency, Period } from './types';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

if (!SPREADSHEET_ID) {
  console.warn('GOOGLE_SHEETS_ID environment variable is not set');
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  if (!privateKey || !clientEmail) {
    throw new Error('Google credentials environment variables are not configured');
  }

  // Ensure the private key is properly formatted with newlines
  // Handle both escaped newlines (\n) and actual newlines
  // The key from Google's JSON file has \n as literal characters that need to be converted
  let formattedKey = privateKey.replace(/\\n/g, '\n').trim();

  // Ensure the key starts and ends with proper markers if they're missing
  if (!formattedKey.includes('BEGIN')) {
    // If no BEGIN marker, the key might be in a different format
    // Try to detect and format it properly
    if (formattedKey.startsWith('-----')) {
      // Already has markers, just ensure proper formatting
    } else {
      // Key might be missing headers - this is unusual but handle it
      console.warn('Private key may be missing PEM headers');
    }
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// Schema operations
export async function fetchSchema(): Promise<Schema> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Schema!A2:D', // Skip header row
  });

  const rows = response.data.values || [];

  const tables = new Set<string>();
  const subcategories: Record<string, Set<string>> = {};
  const lineItems: Record<string, Set<string>> = {};

  for (const row of rows) {
    const [table, subcategory, lineItem, active] = row;

    // Skip inactive items
    if (active?.toUpperCase() !== 'TRUE') continue;

    tables.add(table);

    // Track subcategories per table
    if (!subcategories[table]) {
      subcategories[table] = new Set();
    }
    subcategories[table].add(subcategory);

    // Track line items per subcategory (using "table|subcategory" as key)
    const subKey = `${table}|${subcategory}`;
    if (!lineItems[subKey]) {
      lineItems[subKey] = new Set();
    }
    lineItems[subKey].add(lineItem);
  }

  return {
    tables: Array.from(tables),
    subcategories: Object.fromEntries(
      Object.entries(subcategories).map(([k, v]) => [k, Array.from(v)])
    ),
    lineItems: Object.fromEntries(
      Object.entries(lineItems).map(([k, v]) => [k, Array.from(v)])
    ),
  };
}

// Transaction operations
const TRANSACTION_COLUMNS = [
  'Transaction Date', 'Table', 'Subcategory', 'Line Item', 'Amount', 'Currency',
  'CAD Amount', 'CAD Rate', 'USD Amount', 'USD Rate', 'Vendor', 'Note',
  'Receipt URL', 'Account', 'Period', 'Distribute', 'Tag', 'Submitted At'
];

function rowToTransaction(row: string[], index: number): Transaction {
  return {
    id: String(index + 2), // Row number (1-indexed, +1 for header)
    transactionDate: row[0] || '',
    table: row[1] || '',
    subcategory: row[2] || '',
    lineItem: row[3] || '',
    amount: parseFloat(row[4]) || 0,
    currency: (row[5] as Currency) || 'CAD',
    cadAmount: parseFloat(row[6]) || 0,
    cadRate: parseFloat(row[7]) || 1,
    usdAmount: parseFloat(row[8]) || 0,
    usdRate: parseFloat(row[9]) || 1,
    vendor: row[10] || undefined,
    note: row[11] || undefined,
    receiptUrl: row[12] || undefined,
    account: row[13] || '',
    period: (row[14] as Period) || 'one-time',
    distribute: row[15]?.toUpperCase() === 'TRUE',
    tag: row[16] || undefined,
    submittedAt: row[17] || '',
  };
}

function transactionToRow(transaction: TransactionInput): string[] {
  return [
    transaction.transactionDate,
    transaction.table,
    transaction.subcategory,
    transaction.lineItem,
    String(transaction.amount),
    transaction.currency,
    String(transaction.cadAmount),
    String(transaction.cadRate),
    String(transaction.usdAmount),
    String(transaction.usdRate),
    transaction.vendor || '',
    transaction.note || '',
    transaction.receiptUrl || '',
    transaction.account,
    transaction.period,
    transaction.distribute ? 'TRUE' : 'FALSE',
    transaction.tag || '',
    transaction.submittedAt,
  ];
}

export async function fetchTransactions(options?: {
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{ transactions: Transaction[]; total: number }> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transactions!A2:R', // Skip header row
  });

  const rows = response.data.values || [];
  let transactions = rows.map((row, index) => rowToTransaction(row, index));

  // Filter by date range
  if (options?.startDate) {
    transactions = transactions.filter(t => t.transactionDate >= options.startDate!);
  }
  if (options?.endDate) {
    transactions = transactions.filter(t => t.transactionDate <= options.endDate!);
  }

  const total = transactions.length;

  // Sort by date descending (most recent first)
  transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  // Limit results
  if (options?.limit) {
    transactions = transactions.slice(0, options.limit);
  }

  return { transactions, total };
}

export async function appendTransaction(transaction: TransactionInput): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const row = transactionToRow(transaction);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transactions!A:R',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });
}

export async function updateTransaction(
  rowIndex: number,
  transaction: TransactionInput
): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const row = transactionToRow(transaction);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Transactions!A${rowIndex}:R${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}

export async function deleteTransaction(rowIndex: number): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  // Get sheet ID for Transactions tab
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const transactionsSheet = spreadsheet.data.sheets?.find(
    sheet => sheet.properties?.title === 'Transactions'
  );

  if (!transactionsSheet?.properties?.sheetId) {
    throw new Error('Transactions sheet not found');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: transactionsSheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0-indexed
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

// Autocomplete helpers
export async function getUniqueVendors(): Promise<string[]> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transactions!K2:K', // Vendor column
  });

  const values = response.data.values || [];
  const vendors = new Set<string>();

  for (const row of values) {
    if (row[0]) vendors.add(row[0]);
  }

  return Array.from(vendors).sort();
}

export async function getUniqueAccounts(): Promise<string[]> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transactions!N2:N', // Account column
  });

  const values = response.data.values || [];
  const accounts = new Set<string>();

  // Add default accounts
  accounts.add('RBC Visa');
  accounts.add('RBC Chequing');
  accounts.add('Chase Chequing');

  for (const row of values) {
    if (row[0]) accounts.add(row[0]);
  }

  return Array.from(accounts).sort();
}

export async function getUniqueTags(): Promise<string[]> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Transactions!Q2:Q', // Tag column
  });

  const values = response.data.values || [];
  const tags = new Set<string>();

  for (const row of values) {
    if (row[0]) tags.add(row[0]);
  }

  return Array.from(tags).sort();
}
