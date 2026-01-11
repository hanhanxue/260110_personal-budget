# Cloudflare R2 Setup Guide

This guide will walk you through setting up Cloudflare R2 for photo uploads in your budget app.

## Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Click **R2** in the sidebar
4. Click **Create bucket**
5. Name your bucket (e.g., `personal-budget-receipts`)
6. Click **Create bucket**

## Step 2: Get R2 API Credentials

1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Configure:
   - **Token name**: `personal-budget-upload` (or any name you prefer)
   - **Permissions**: Select **Object Read & Write**
   - **TTL**: Leave blank (or set expiration if desired)
4. Click **Create API Token**
5. **IMPORTANT**: Copy and save these values immediately (you won't see them again):
   - **Access Key ID**
   - **Secret Access Key**
6. Also note your **Account ID** (shown on the R2 overview page)

## Step 3: Configure CORS (for Public Access)

1. In your bucket, go to **Settings**
2. Scroll to **CORS Policy**
3. Add this CORS configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Click **Save**

## Step 4: Set Up Public Access

You have two options for public access:

### Option A: Use R2.dev Subdomain (Easiest)

1. In your bucket, go to **Settings**
2. Scroll to **Public Access**
3. Enable **Public Access**
4. Your public URL will be: `https://<bucket-name>.<account-id>.r2.dev`

### Option B: Use Custom Domain (Recommended for Production)

1. In your bucket, go to **Settings**
2. Scroll to **Public Access**
3. Enable **Public Access**
4. Click **Connect Domain**
5. Follow the instructions to connect your custom domain

## Step 5: Set Environment Variables

Add these environment variables to your `.env.local` file (for local development) and Vercel (for production):

### Required Variables:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-access-key-id-here
R2_SECRET_ACCESS_KEY=your-secret-access-key-here
R2_BUCKET_NAME=personal-budget-receipts
R2_PUBLIC_URL=https://your-bucket.your-account-id.r2.dev
```

### Optional Variables:

```env
# If you want to use a custom endpoint (usually not needed)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

### For Vercel:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable above
4. Make sure to add them for **Production**, **Preview**, and **Development** environments
5. Redeploy your application

## Step 6: Test the Upload

1. Start your development server: `npm run dev`
2. Try uploading a receipt photo
3. Check that the photo appears in your R2 bucket
4. Verify the photo URL is accessible

## Troubleshooting

### "R2 storage is not configured" Error

- Make sure all required environment variables are set
- Check that variable names match exactly (case-sensitive)
- Restart your development server after adding variables

### "Access Denied" or 403 Errors

- Verify your Access Key ID and Secret Access Key are correct
- Check that your API token has "Object Read & Write" permissions
- Ensure CORS is configured correctly

### Photos Not Accessible Publicly

- Make sure Public Access is enabled in your bucket settings
- Verify your R2_PUBLIC_URL is correct
- If using custom domain, ensure DNS is configured properly

### Upload Works But URL Doesn't Load

- Check that the file was actually uploaded to R2 (check in Cloudflare dashboard)
- Verify the R2_PUBLIC_URL format is correct
- Ensure Public Access is enabled for the bucket

## Cost Considerations

- Cloudflare R2 offers **10 GB free storage** per month
- **10 million Class A operations** (writes) free per month
- **1 million Class B operations** (reads) free per month
- After free tier: $0.015 per GB storage, $4.50 per million Class A operations

For a personal budget app, you'll likely stay well within the free tier!
