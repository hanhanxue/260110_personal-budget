import { NextRequest, NextResponse } from 'next/server';
import {
  fetchTransactions,
  appendTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/lib/google-sheets';
import type {
  ApiResponse,
  TransactionsListResponse,
  TransactionInput,
  Currency,
  Distribute,
} from '@/lib/types';
import { CURRENCIES, DISTRIBUTE_OPTIONS } from '@/lib/types';

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<TransactionsListResponse>>> {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const result = await fetchTransactions({
      limit: limit ? parseInt(limit, 10) : 20,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      },
      { status: 500 }
    );
  }
}

function validateTransaction(data: unknown): TransactionInput | { error: string } {
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid request body' };
  }

  const t = data as Record<string, unknown>;

  // Required fields
  if (!t.transactionDate || typeof t.transactionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.transactionDate)) {
    return { error: 'Invalid date format (expected YYYY-MM-DD)' };
  }

  if (!t.table || typeof t.table !== 'string') {
    return { error: 'Table is required' };
  }

  if (!t.subcategory || typeof t.subcategory !== 'string') {
    return { error: 'Subcategory is required' };
  }

  if (!t.lineItem || typeof t.lineItem !== 'string') {
    return { error: 'Line Item is required' };
  }

  if (typeof t.amount !== 'number' || t.amount <= 0) {
    return { error: 'Amount must be a positive number' };
  }

  if (!t.currency || !CURRENCIES.includes(t.currency as Currency)) {
    return { error: `Currency must be one of: ${CURRENCIES.join(', ')}` };
  }

  if (typeof t.cadAmount !== 'number' || t.cadAmount <= 0) {
    return { error: 'CAD Amount is required' };
  }

  if (typeof t.cadRate !== 'number' || t.cadRate <= 0) {
    return { error: 'CAD Rate is required' };
  }

  if (typeof t.usdAmount !== 'number' || t.usdAmount <= 0) {
    return { error: 'USD Amount is required' };
  }

  if (typeof t.usdRate !== 'number' || t.usdRate <= 0) {
    return { error: 'USD Rate is required' };
  }

  if (!t.account || typeof t.account !== 'string') {
    return { error: 'Account is required' };
  }

  if (!t.distribute || !DISTRIBUTE_OPTIONS.includes(t.distribute as Distribute)) {
    return { error: `Distribute must be one of: ${DISTRIBUTE_OPTIONS.join(', ')}` };
  }

  if (!t.submittedAt || typeof t.submittedAt !== 'string') {
    return { error: 'Submitted timestamp is required' };
  }

  return {
    transactionDate: t.transactionDate,
    table: t.table,
    subcategory: t.subcategory,
    lineItem: t.lineItem,
    amount: t.amount,
    currency: t.currency as Currency,
    cadAmount: t.cadAmount,
    cadRate: t.cadRate,
    usdAmount: t.usdAmount,
    usdRate: t.usdRate,
    vendor: typeof t.vendor === 'string' ? t.vendor : undefined,
    note: typeof t.note === 'string' ? t.note : undefined,
    receiptUrl: typeof t.receiptUrl === 'string' ? t.receiptUrl : undefined,
    account: t.account,
    distribute: t.distribute as Distribute,
    tag: typeof t.tag === 'string' ? t.tag : undefined,
    submittedAt: t.submittedAt,
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  // Check authentication
  const authHeader = request.headers.get('x-auth-password');
  const APP_PASSWORD = process.env.APP_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, require password to be set
  if (isProduction && !APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Password protection is not configured. Please set APP_PASSWORD environment variable.' },
      { status: 500 }
    );
  }
  
  if (APP_PASSWORD && authHeader !== APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validation = validateTransaction(body);

    if ('error' in validation) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    await appendTransaction(validation);

    return NextResponse.json({
      success: true,
      data: { message: 'Transaction saved successfully' },
    });
  } catch (error) {
    console.error('Error saving transaction:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save transaction',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  // Check authentication
  const authHeader = request.headers.get('x-auth-password');
  const APP_PASSWORD = process.env.APP_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, require password to be set
  if (isProduction && !APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Password protection is not configured. Please set APP_PASSWORD environment variable.' },
      { status: 500 }
    );
  }
  
  if (APP_PASSWORD && authHeader !== APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const rowIndex = parseInt(id, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateTransaction(body);

    if ('error' in validation) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    await updateTransaction(rowIndex, validation);

    return NextResponse.json({
      success: true,
      data: { message: 'Transaction updated successfully' },
    });
  } catch (error) {
    console.error('Error updating transaction:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transaction',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
  // Check authentication
  const authHeader = request.headers.get('x-auth-password');
  const APP_PASSWORD = process.env.APP_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, require password to be set
  if (isProduction && !APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Password protection is not configured. Please set APP_PASSWORD environment variable.' },
      { status: 500 }
    );
  }
  
  if (APP_PASSWORD && authHeader !== APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const rowIndex = parseInt(id, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    await deleteTransaction(rowIndex);

    return NextResponse.json({
      success: true,
      data: { message: 'Transaction deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete transaction',
      },
      { status: 500 }
    );
  }
}
