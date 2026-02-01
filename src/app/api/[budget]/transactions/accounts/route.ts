import { NextResponse } from 'next/server';
import { getUniqueAccounts } from '@/lib/google-sheets';
import { parseBudgetParam, invalidBudgetResponse } from '@/lib/budget-param';
import type { ApiResponse, AutocompleteResponse } from '@/lib/types';

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ budget: string }> }
): Promise<NextResponse<ApiResponse<AutocompleteResponse>>> {
  const { budget: budgetParam } = await params;
  const budget = parseBudgetParam(budgetParam);
  if (!budget) return invalidBudgetResponse();

  try {
    const values = await getUniqueAccounts(budget);
    return NextResponse.json({ success: true, data: { values } });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
