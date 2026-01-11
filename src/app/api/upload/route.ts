import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { ApiResponse } from '@/lib/types';

interface UploadResponse {
  url: string;
}

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // Your custom domain or R2 public URL

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

    // Validate R2 configuration
    if (!R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'R2 storage is not configured. Please set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.',
        },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `receipts/${timestamp}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Construct the public URL
    // R2_PUBLIC_URL should be your custom domain (e.g., https://receipts.yourdomain.com)
    // or your R2.dev subdomain (e.g., https://your-bucket.your-account-id.r2.dev)
    // Format: https://<bucket-name>.<account-id>.r2.dev
    if (!R2_PUBLIC_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'R2_PUBLIC_URL is not configured. Please set it to your R2 public URL (e.g., https://your-bucket.your-account-id.r2.dev)',
        },
        { status: 500 }
      );
    }
    
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;

    return NextResponse.json({
      success: true,
      data: { url: publicUrl },
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
