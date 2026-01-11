import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'https';
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

  // Validate R2 configuration
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    return NextResponse.json(
      {
        success: false,
        error: 'R2 storage is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL environment variables.',
      },
      { status: 500 }
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

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create S3 client for Cloudflare R2
    // R2 requires forcePathStyle and proper endpoint configuration
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    console.log('R2 Configuration:', {
      endpoint,
      bucket: R2_BUCKET_NAME,
      hasAccessKey: !!R2_ACCESS_KEY_ID,
      hasSecretKey: !!R2_SECRET_ACCESS_KEY,
      accountId: R2_ACCOUNT_ID,
    });

    // Use custom request handler with HTTPS agent to avoid SSL issues
    // This helps with SSL handshake failures on Windows/Node.js
    const httpsAgent = new Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000,
    });

    const requestHandler = new NodeHttpHandler({
      requestTimeout: 30000,
      connectionTimeout: 10000,
      httpsAgent: httpsAgent,
    });

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Required for R2 - uses path-style URLs
      requestHandler, // Use custom handler
    });

    // Upload to Cloudflare R2
    console.log(`Uploading to R2: ${R2_BUCKET_NAME}/${filename} (${buffer.length} bytes)`);
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    });

    try {
      await s3Client.send(command);
      console.log('Upload successful to R2');
    } catch (uploadError) {
      console.error('R2 Upload Error Details:', {
        error: uploadError,
        message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        code: uploadError && typeof uploadError === 'object' && 'code' in uploadError ? uploadError.code : undefined,
        endpoint,
        bucket: R2_BUCKET_NAME,
      });
      throw uploadError;
    }

    // Construct the public URL
    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${filename}`;

    return NextResponse.json({
      success: true,
      data: { url: publicUrl },
    });
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && 'code' in error ? ` (${error.code})` : '';

    return NextResponse.json(
      {
        success: false,
        error: `Failed to upload file: ${errorMessage}${errorDetails}`,
      },
      { status: 500 }
    );
  }
}
