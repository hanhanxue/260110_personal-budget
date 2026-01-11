import { NextResponse } from 'next/server';
import { fetchSchema } from '@/lib/google-sheets';
import type { ApiResponse, Schema } from '@/lib/types';

// Cache schema for 5 minutes (schema doesn't change often)
export const revalidate = 300;

export async function GET(): Promise<NextResponse<ApiResponse<Schema>>> {
  try {
    const schema = await fetchSchema();

    return NextResponse.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    console.error('Error fetching schema:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch schema',
      },
      { status: 500 }
    );
  }
}
