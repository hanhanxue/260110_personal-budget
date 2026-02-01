import { NextResponse } from 'next/server';
import { fetchSchema } from '@/lib/google-sheets';
import { parseBudgetParam, invalidBudgetResponse } from '@/lib/budget-param';
import type { ApiResponse, Schema } from '@/lib/types';

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ budget: string }> }
): Promise<NextResponse<ApiResponse<Schema>>> {
  const { budget: budgetParam } = await params;
  const budget = parseBudgetParam(budgetParam);
  if (!budget) return invalidBudgetResponse();

  try {
    const schema = await fetchSchema(budget);
    return NextResponse.json({ success: true, data: schema });
  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch schema' },
      { status: 500 }
    );
  }
}
