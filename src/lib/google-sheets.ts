import { google } from 'googleapis';
import type { Schema, SchemaRow, Transaction, TransactionInput, Currency, Distribute, Defaults } from './types';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

if (!SPREADSHEET_ID) {
  console.warn('GOOGLE_SHEETS_ID environment variable is not set');
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  if (!privateKey || !clientEmail) {
    return null;
  }

  try {
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
  } catch (error) {
    // Handle OpenSSL or other auth errors gracefully
    console.error('Error initializing Google Auth:', error);
    return null;
  }
}

function getSheets() {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Google credentials are not available');
  }
  return google.sheets({ version: 'v4', auth });
}

// Schema operations
export async function fetchSchema(): Promise<Schema> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  try {
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
  } catch (error) {
    // Handle OpenSSL or other errors gracefully during build
    console.error('Error fetching schema:', error);
    throw error;
  }
}

// Transaction operations
const TRANSACTION_COLUMNS = [
  'Transaction Date', 'Table', 'Subcategory', 'Line Item', 'Amount', 'Currency',
  'CAD Amount', 'CAD Rate', 'USD Amount', 'USD Rate', 'Vendor', 'Note',
  'Receipt URL', 'Account', 'Distribute', 'Tag', 'Submitted At'
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
    distribute: (row[14] as Distribute) || 'one-time',
    tag: row[15] || undefined,
    submittedAt: row[16] || '',
  };
}

function transactionToRow(transaction: TransactionInput): (string | number)[] {
  // Parse the date and convert to Google Sheets date serial number
  // Google Sheets uses days since December 30, 1899
  const dateParts = transaction.transactionDate.split('-');
  const date = new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10)
  );
  
  // Calculate serial number: days since December 30, 1899
  const epoch = new Date(1899, 11, 30);
  const serialNumber = Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
  
  return [
    serialNumber, // Use serial number instead of string
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
    transaction.distribute,
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
    range: 'Transactions!A2:Q', // Skip header row
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

  // Get the sheet ID first
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const transactionsSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties?.title === 'Transactions'
  );

  if (!transactionsSheet?.properties?.sheetId) {
    throw new Error('Transactions sheet not found');
  }

  const sheetId = transactionsSheet.properties.sheetId;
  const rowNumber = 2; // Insert at row 2 (right after header row 1)

  // Insert a new row at row 2 and add the transaction data
  // This will shift all existing rows down
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        // Insert a new row at row 2 (0-based index: 1)
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: 1, // 0-based: row 1 = row 2 in the sheet
              endIndex: 2,
            },
            inheritFromBefore: false,
          },
        },
        // Update the new row with transaction data
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1, // 0-based: row 1 = row 2 in the sheet
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: row.length,
            },
            rows: [
              {
                values: row.map((value) => {
                  if (typeof value === 'number') {
                    return {
                      userEnteredValue: { numberValue: value },
                    };
                  } else {
                    return {
                      userEnteredValue: { stringValue: String(value) },
                    };
                  }
                }),
              },
            ],
            fields: 'userEnteredValue',
          },
        },
        // Format the date cell (column A) to display as YYYY-MM-DD
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1, // 0-based: row 1 = row 2 in the sheet
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'DATE',
                  pattern: 'yyyy-mm-dd',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
      ],
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
    range: `Transactions!A${rowIndex}:Q${rowIndex}`,
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

// Fetch accounts from Accounts sheet (similar to Schema)
export async function fetchAccounts(): Promise<string[]> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  try {
    const sheets = getSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Accounts!A2:B', // Account name and Active status
    });

    const rows = response.data.values || [];
    const accounts: string[] = [];

    for (const row of rows) {
      const [accountName, active] = row;

      // Skip if no account name
      if (!accountName) continue;

      // If there's an Active column, only include active accounts
      // If no Active column, include all accounts
      if (active !== undefined && active?.toUpperCase() !== 'TRUE') {
        continue;
      }

      accounts.push(accountName);
    }

    return accounts; // Return in the order they appear in the sheet
  } catch (error) {
    console.error('Error fetching accounts from Accounts sheet:', error);
    // Fallback to empty array if Accounts sheet doesn't exist
    return [];
  }
}

export async function getUniqueAccounts(): Promise<string[]> {
  // First try to fetch from Accounts sheet
  const accountsFromSheet = await fetchAccounts();
  
  // If we got accounts from the sheet, use those
  if (accountsFromSheet.length > 0) {
    return accountsFromSheet;
  }

  // Fallback: fetch from Transactions column (for backward compatibility)
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

  // Add default accounts as fallback
  accounts.add('RBC Visa');
  accounts.add('RBC Checking');
  accounts.add('BMO Checking');
  accounts.add('Chase Total Checking');

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

// Fetch defaults from Defaults sheet
export async function fetchDefaults(): Promise<Defaults> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_ID environment variable is not configured');
  }

  try {
    const sheets = getSheets();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Defaults!A2:D', // Line Item, Vendor, Tag, Active
    });

    const rows = response.data.values || [];
    const defaults: Defaults = {};

    for (const row of rows) {
      const [lineItem, vendor, tag, active] = row;

      // Skip if no line item
      if (!lineItem) continue;

      // Skip inactive items
      if (active !== undefined && active?.toUpperCase() !== 'TRUE') {
        continue;
      }

      // Store defaults for this line item
      defaults[lineItem] = {};
      if (vendor) defaults[lineItem].vendor = vendor;
      if (tag) defaults[lineItem].tag = tag;
    }

    return defaults;
  } catch (error) {
    console.error('Error fetching defaults from Defaults sheet:', error);
    // Return empty defaults if sheet doesn't exist
    return {};
  }
}
