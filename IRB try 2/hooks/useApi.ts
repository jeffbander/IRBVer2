// Custom React hook for API calls with authentication and error handling
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  redirectOnUnauth?: boolean;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const router = useRouter();
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const getToken = useCallback(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return null;
    }
    const token = localStorage.getItem('token');
    if (!token && options.redirectOnUnauth !== false) {
      router.push('/login');
      return null;
    }
    return token;
  }, [router, options.redirectOnUnauth]);

  const request = useCallback(
    async (url: string, config: RequestInit = {}) => {
      setState({ data: null, loading: true, error: null });

      try {
        const token = getToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(url, {
          ...config,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...config.headers,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            router.push('/login');
            throw new Error('Session expired. Please login again.');
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();

        setState({ data, loading: false, error: null });

        if (options.onSuccess) {
          options.onSuccess(data);
        }

        return data;
      } catch (error: any) {
        const errorMessage = error.message || 'An unexpected error occurred';

        setState({ data: null, loading: false, error: errorMessage });

        if (options.onError) {
          options.onError(errorMessage);
        }

        throw error;
      }
    },
    [getToken, router, options]
  );

  const get = useCallback(
    (url: string) => {
      return request(url, { method: 'GET' });
    },
    [request]
  );

  const post = useCallback(
    (url: string, data: any) => {
      return request(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    [request]
  );

  const put = useCallback(
    (url: string, data: any) => {
      return request(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    [request]
  );

  const del = useCallback(
    (url: string) => {
      return request(url, { method: 'DELETE' });
    },
    [request]
  );

  const patch = useCallback(
    (url: string, data: any) => {
      return request(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    [request]
  );

  const uploadFile = useCallback(
    async (url: string, formData: FormData) => {
      setState({ data: null, loading: true, error: null });

      try {
        const token = getToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type - browser will set it with boundary for FormData
          },
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 401) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            router.push('/login');
            throw new Error('Session expired. Please login again.');
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        }

        const data = await response.json();

        setState({ data, loading: false, error: null });

        if (options.onSuccess) {
          options.onSuccess(data);
        }

        return data;
      } catch (error: any) {
        const errorMessage = error.message || 'Upload failed';

        setState({ data: null, loading: false, error: errorMessage });

        if (options.onError) {
          options.onError(errorMessage);
        }

        throw error;
      }
    },
    [getToken, router, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    get,
    post,
    put,
    delete: del,
    patch,
    uploadFile,
    request,
    reset,
  };
}

// Specialized hook for auth operations (doesn't redirect on failure)
export function useAuthApi() {
  return useApi({ redirectOnUnauth: false });
}
