'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/state';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = `/api/auth?action=${isLogin ? 'login' : 'register'}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store user in Zustand state (token is in httpOnly cookie)
      useAuthStore.getState().login(data.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-heading via-brand-navy to-brand-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo/Header - Mount Sinai Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-brand-primary to-brand-accent text-white rounded-2xl mb-4 shadow-xl">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <h1 className="text-h1 font-bold text-brand-heading">Mount Sinai</h1>
          <p className="text-brand-primary font-semibold text-lg mt-1">IRB Management System</p>
          <p className="text-gray-600 mt-2 text-sm">Institutional Review Board Portal</p>
        </div>

        {/* Toggle - Mount Sinai Design */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-md transition-all font-semibold ${
              isLogin
                ? 'bg-white text-brand-primary shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-md transition-all font-semibold ${
              !isLogin
                ? 'bg-white text-brand-primary shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <Input
                label="First Name"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="John"
              />
              <Input
                label="Last Name"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required={!isLogin}
                placeholder="Doe"
              />
            </>
          )}

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="you@mountsinai.org"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder="••••••••"
          />

          {error && (
            <div className="bg-status-error/10 text-status-error px-4 py-3 rounded-lg text-sm border border-status-error/20 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            isLoading={loading}
            variant="primary"
            className="w-full"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-brand-primary font-semibold hover:text-brand-primary-hover transition-colors"
              >
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-brand-primary font-semibold hover:text-brand-primary-hover transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      {/* Initialize database button */}
      {isLogin && (
        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/auth/seed', { method: 'POST' });
              const data = await response.json();
              alert('Database initialized! Default admin: admin@irb.local / admin123');
            } catch (error) {
              alert('Failed to initialize database');
            }
          }}
          className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-all"
        >
          Initialize Database
        </button>
      )}
    </div>
  );
}