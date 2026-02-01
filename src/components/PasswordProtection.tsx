'use client';

import { useState, useEffect } from 'react';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if already authenticated in this session
    const authStatus = sessionStorage.getItem('budget-auth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('budget-auth', 'authenticated');
        // Store password in sessionStorage for API calls (not ideal but simple)
        // In production, use proper session tokens
        sessionStorage.setItem('budget-password', password);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setError(data.error || 'Incorrect password');
        setPassword('');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Failed to verify password. Please try again.');
      setPassword('');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Budget Tracker
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Please enter your password to continue
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 text-base rounded-lg border border-gray-300
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white 
                         font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
