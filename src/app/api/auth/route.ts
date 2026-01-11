import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

const APP_PASSWORD = process.env.APP_PASSWORD;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ authenticated: boolean }>>> {
  // In production, require a password to be set
  if (!APP_PASSWORD) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password protection is not configured. Please set APP_PASSWORD environment variable.',
        },
        { status: 500 }
      );
    }
    // In development, allow access if no password is set
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
