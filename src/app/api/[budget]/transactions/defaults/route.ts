import { NextResponse } from 'next/server';
import { fetchDefaults } from '@/lib/google-sheets';
import { parseBudgetParam, invalidBudgetResponse } from '@/lib/budget-param';
import type { ApiResponse, DefaultsResponse } from '@/lib/types';

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ budget: string }> }
): Promise<NextResponse<ApiResponse<DefaultsResponse>>> {
  const { budget: budgetParam } = await params;
  const budget = parseBudgetParam(budgetParam);
  if (!budget) return invalidBudgetResponse();

  try {
    const defaults = await fetchDefaults(budget);
    return NextResponse.json({ success: true, data: { defaults } });
  } catch (error) {
    console.error('Error fetching defaults:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch defaults' },
      { status: 500 }
    );
  }
}
