import { google } from 'googleapis';
import type {
  BudgetType,
  Schema,
  Transaction,
  TransactionInput,
  PersonalTransaction,
  BusinessTransaction,
  PersonalTransactionInput,
  BusinessTransactionInput,
  Currency,
  Distribute,
} from './types';
import { DEFAULT_PERSONAL_ACCOUNTS, DEFAULT_BUSINESS_ACCOUNTS } from './types';

// Distribute migration map: old values → new values
const DISTRIBUTE_MIGRATION: Record<string, Distribute> = {
  'per month': 'monthly',
  'semi-annual': 'yearly',
};

function migrateDistribute(value: string): Distribute {
  return DISTRIBUTE_MIGRATION[value] || (value as Distribute) || 'one-time';
}

function getSpreadsheetId(budget: BudgetType): string {
  const id =
    budget === 'personal'
      ? process.env.PERSONAL_GOOGLE_SHEETS_ID
      : process.env.BUSINESS_GOOGLE_SHEETS_ID;

  if (!id) {
    throw new Error(
      `${budget === 'personal' ? 'PERSONAL' : 'BUSINESS'}_GOOGLE_SHEETS_ID environment variable is not configured`
    );
  }
  return id;
}

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    return null;
  }

  try {
    let formattedKey = privateKey.replace(/\\n/g, '\n').trim();

    if (!formattedKey.includes('BEGIN')) {
      if (formattedKey.startsWith('-----')) {
        // Already has markers
      } else {
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
export async function fetchSchema(budget: BudgetType): Promise<Schema> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Schema!A2:D',
    });

    const rows = response.data.values || [];

    const tables = new Set<string>();
    const subcategories: Record<string, Set<string>> = {};
    const lineItems: Record<string, Set<string>> = {};

    for (const row of rows) {
      const [table, subcategory, lineItem, active] = row;
      if (active?.toUpperCase() !== 'TRUE') continue;

      tables.add(table);

      if (!subcategories[table]) {
        subcategories[table] = new Set();
      }
      subcategories[table].add(subcategory);

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
    console.error('Error fetching schema:', error);
    throw error;
  }
}

// Column layouts:
// Personal (17 cols, A2:Q):
//   Date, Table, Subcategory, Line Item, Amount, Currency,
//   CAD Amount, CAD Rate, USD Amount, USD Rate, Vendor, Note,
//   Receipt URL, Account, Distribute, Tag, Submitted At
//
// Business (18 cols, A2:R):
//   Date, Table, Subcategory, Line Item, Amount, Currency,
//   CAD Amount, CAD Rate, USD Amount, USD Rate, Vendor, Note,
//   Receipt URL, Account, Tag, GST/HST Paid, Capital Expense, Submitted At

function personalRowToTransaction(row: string[], index: number): PersonalTransaction {
  return {
    id: String(index + 2),
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
    distribute: migrateDistribute(row[14] || 'one-time'),
    tag: row[15] || undefined,
    submittedAt: row[16] || '',
  };
}

function businessRowToTransaction(row: string[], index: number): BusinessTransaction {
  return {
    id: String(index + 2),
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
    tag: row[14] || undefined,
    gstHstPaid: row[15] ? parseFloat(row[15]) : undefined,
    capitalExpense: row[16]?.toUpperCase() === 'TRUE',
    submittedAt: row[17] || '',
  };
}

function dateToSerialNumber(dateString: string): number {
  const dateParts = dateString.split('-');
  const date = new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10)
  );
  const epoch = new Date(1899, 11, 30);
  return Math.floor((date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
}

function personalTransactionToRow(transaction: PersonalTransactionInput): (string | number)[] {
  return [
    dateToSerialNumber(transaction.transactionDate),
    transaction.table,
    transaction.subcategory,
    transaction.lineItem,
    transaction.amount,
    transaction.currency,
    transaction.cadAmount,
    transaction.cadRate,
    transaction.usdAmount,
    transaction.usdRate,
    transaction.vendor || '',
    transaction.note || '',
    transaction.receiptUrl || '',
    transaction.account,
    transaction.distribute,
    transaction.tag || '',
    transaction.submittedAt,
  ];
}

function businessTransactionToRow(transaction: BusinessTransactionInput): (string | number)[] {
  return [
    dateToSerialNumber(transaction.transactionDate),
    transaction.table,
    transaction.subcategory,
    transaction.lineItem,
    transaction.amount,
    transaction.currency,
    transaction.cadAmount,
    transaction.cadRate,
    transaction.usdAmount,
    transaction.usdRate,
    transaction.vendor || '',
    transaction.note || '',
    transaction.receiptUrl || '',
    transaction.account,
    transaction.tag || '',
    transaction.gstHstPaid != null ? String(transaction.gstHstPaid) : '',
    transaction.capitalExpense ? 'TRUE' : 'FALSE',
    transaction.submittedAt,
  ];
}

function transactionToRow(budget: BudgetType, transaction: TransactionInput): (string | number)[] {
  if (budget === 'personal') {
    return personalTransactionToRow(transaction as PersonalTransactionInput);
  }
  return businessTransactionToRow(transaction as BusinessTransactionInput);
}

function getColumnRange(budget: BudgetType): string {
  return budget === 'personal' ? 'Q' : 'R';
}

export async function fetchTransactions(
  budget: BudgetType,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ transactions: Transaction[]; total: number }> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();
  const lastCol = getColumnRange(budget);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Transactions!A2:${lastCol}`,
  });

  const rows = response.data.values || [];
  const rowMapper =
    budget === 'personal' ? personalRowToTransaction : businessRowToTransaction;

  let transactions: Transaction[] = rows.map((row, index) => rowMapper(row, index));

  if (options?.startDate) {
    transactions = transactions.filter((t) => t.transactionDate >= options.startDate!);
  }
  if (options?.endDate) {
    transactions = transactions.filter((t) => t.transactionDate <= options.endDate!);
  }

  const total = transactions.length;

  transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  if (options?.limit) {
    transactions = transactions.slice(0, options.limit);
  }

  return { transactions, total };
}

export async function appendTransaction(
  budget: BudgetType,
  transaction: TransactionInput
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();
  const row = transactionToRow(budget, transaction);

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });

  const transactionsSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties?.title === 'Transactions'
  );

  if (!transactionsSheet?.properties?.sheetId) {
    throw new Error('Transactions sheet not found');
  }

  const sheetId = transactionsSheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 1,
              endIndex: 2,
            },
            inheritFromBefore: false,
          },
        },
        {
          updateCells: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: row.length,
            },
            rows: [
              {
                values: row.map((value) => {
                  if (typeof value === 'number') {
                    return { userEnteredValue: { numberValue: value } };
                  }
                  return { userEnteredValue: { stringValue: String(value) } };
                }),
              },
            ],
            fields: 'userEnteredValue',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // Amount (col E, index 4) — currency
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 4,
              endColumnIndex: 5,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '#,##0.00' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // CAD Amount (col G, index 6) and USD Amount (col I, index 8) — currency
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 6,
              endColumnIndex: 7,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '#,##0.00' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 8,
              endColumnIndex: 9,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '#,##0.00' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        // CAD Rate (col H, index 7) and USD Rate (col J, index 9) — 5 decimals
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 7,
              endColumnIndex: 8,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '0.00000' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 9,
              endColumnIndex: 10,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '0.00000' },
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
  budget: BudgetType,
  rowIndex: number,
  transaction: TransactionInput
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();
  const row = transactionToRow(budget, transaction);
  const lastCol = getColumnRange(budget);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Transactions!A${rowIndex}:${lastCol}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function deleteTransaction(
  budget: BudgetType,
  rowIndex: number
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });

  const transactionsSheet = spreadsheet.data.sheets?.find(
    (sheet) => sheet.properties?.title === 'Transactions'
  );

  if (!transactionsSheet?.properties?.sheetId) {
    throw new Error('Transactions sheet not found');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: transactionsSheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

// Autocomplete helpers
export async function getUniqueVendors(budget: BudgetType): Promise<string[]> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Transactions!K2:K', // Vendor column (same for both)
  });

  const values = response.data.values || [];
  const vendors = new Set<string>();

  for (const row of values) {
    if (row[0]) vendors.add(row[0]);
  }

  return Array.from(vendors).sort();
}

export async function getUniqueAccounts(budget: BudgetType): Promise<string[]> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Transactions!N2:N', // Account column (same for both)
  });

  const values = response.data.values || [];
  const defaults =
    budget === 'personal' ? DEFAULT_PERSONAL_ACCOUNTS : DEFAULT_BUSINESS_ACCOUNTS;

  const accounts = new Set<string>(defaults);

  for (const row of values) {
    if (row[0]) accounts.add(row[0]);
  }

  return Array.from(accounts).sort();
}

export async function getUniqueTags(budget: BudgetType): Promise<string[]> {
  const spreadsheetId = getSpreadsheetId(budget);
  const sheets = getSheets();

  // Personal: Tag is col P (index 15, column 16)
  // Business: Tag is col O (index 14, column 15)
  const tagColumn = budget === 'personal' ? 'P' : 'O';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Transactions!${tagColumn}2:${tagColumn}`,
  });

  const values = response.data.values || [];
  const tags = new Set<string>();

  for (const row of values) {
    if (row[0]) tags.add(row[0]);
  }

  return Array.from(tags).sort();
}
