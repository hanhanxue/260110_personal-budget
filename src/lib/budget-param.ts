import { NextResponse } from 'next/server';
import type { BudgetType, ApiResponse } from './types';

export function parseBudgetParam(budget: string): BudgetType | null {
  if (budget === 'personal' || budget === 'business') {
    return budget;
  }
  return null;
}

export function invalidBudgetResponse(): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { success: false, error: 'Invalid budget type. Must be "personal" or "business".' },
    { status: 400 }
  );
}
