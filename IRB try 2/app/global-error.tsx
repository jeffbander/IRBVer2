'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for root layout errors
 * Catches errors that occur in the root layout
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);

    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #fee2e2, #fecaca)',
          padding: '1rem',
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            padding: '2rem',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '5rem',
                height: '5rem',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '9999px',
                marginBottom: '1.5rem',
              }}>
                <svg style={{ width: '2.5rem', height: '2.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '0.5rem',
              }}>
                Critical Error
              </h1>

              <p style={{
                color: '#6b7280',
                marginBottom: '1.5rem',
              }}>
                A critical error occurred. Please refresh the page or contact support if the problem persists.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  background: '#f3f4f6',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                }}>
                  <pre style={{
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#dc2626',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}>
                    {error.message}
                  </pre>
                  {error.digest && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.5rem',
                    }}>
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={reset}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    background: '#003F6C',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '1rem',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#002D4F'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#003F6C'}
                >
                  Try Again
                </button>

                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '1rem',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  Reload Application
                </button>
              </div>

              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb',
              }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Need help?{' '}
                  <a
                    href="mailto:support@irb.local"
                    style={{
                      color: '#003F6C',
                      textDecoration: 'none',
                      fontWeight: '500',
                    }}
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
