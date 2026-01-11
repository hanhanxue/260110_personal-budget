import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

const APP_PASSWORD = process.env.APP_PASSWORD;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ authenticated: boolean }>>> {
  if (!APP_PASSWORD) {
    // If no password is set, allow access (for development)
    return NextResponse.json({
      success: true,
      data: { authenticated: true },
    });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== APP_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Incorrect password',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { authenticated: true },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
      },
      { status: 400 }
    );
  }
}
