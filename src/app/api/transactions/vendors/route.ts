import { NextResponse } from 'next/server';
import { getUniqueVendors } from '@/lib/google-sheets';
import type { ApiResponse, AutocompleteResponse } from '@/lib/types';

// Cache for 1 minute
export const revalidate = 60;

export async function GET(): Promise<NextResponse<ApiResponse<AutocompleteResponse>>> {
  try {
    const values = await getUniqueVendors();

    return NextResponse.json({
      success: true,
      data: { values },
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vendors',
      },
      { status: 500 }
    );
  }
}
