import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import type { ApiResponse } from '@/lib/types';

interface UploadResponse {
  url: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<UploadResponse>>> {
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Allowed: JPEG, PNG, WebP, HEIC',
        },
        { status: 400 }
      );
    }

    // Max 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `receipts/${timestamp}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      data: { url: blob.url },
    });
  } catch (error) {
    console.error('Error uploading file:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    );
  }
}
