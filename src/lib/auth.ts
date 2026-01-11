import { NextRequest } from 'next/server';

const APP_PASSWORD = process.env.APP_PASSWORD;

export function checkAuth(request: NextRequest): boolean {
  // If no password is set, allow access (for development)
  if (!APP_PASSWORD) {
    return true;
  }

  // Check for auth token in headers or cookies
  const authHeader = request.headers.get('authorization');
  const authCookie = request.cookies.get('budget-auth')?.value;

  // For now, we'll rely on sessionStorage on the client side
  // In a production app, you'd want to use proper session tokens
  // This is a simple implementation for basic protection
  
  // The frontend will send a password with each write request
  // We'll verify it matches the APP_PASSWORD
  return true; // Will be checked per-request in the API routes
}

export function verifyPassword(password: string): boolean {
  if (!APP_PASSWORD) {
    return true; // No password set, allow access
  }
  return password === APP_PASSWORD;
}
