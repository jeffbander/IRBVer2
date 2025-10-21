'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        duration: 5000,
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
        },
      }}
    />
  );
}
