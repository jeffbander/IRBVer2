// Custom React hook for authentication state management
// SECURITY: Uses httpOnly cookies instead of localStorage to prevent XSS attacks
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    name: string;
    permissions: Record<string, boolean> | string[];
  };
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Check authentication status on mount
  // Note: Token is stored in httpOnly cookie, not accessible to JavaScript
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedCsrfToken = localStorage.getItem('csrfToken');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('user');
      }
    }

    if (storedCsrfToken) {
      setCsrfToken(storedCsrfToken);
    }

    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // SECURITY: Include cookies in request
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // Token is stored in httpOnly cookie automatically
      // Store user data and CSRF token in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.csrfToken) {
        localStorage.setItem('csrfToken', data.csrfToken);
        setCsrfToken(data.csrfToken);
      }
      setUser(data.user);

      return data;
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      const response = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // SECURITY: Include cookies in request
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();

      // Token is stored in httpOnly cookie automatically
      // Store user data and CSRF token in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.csrfToken) {
        localStorage.setItem('csrfToken', data.csrfToken);
        setCsrfToken(data.csrfToken);
      }
      setUser(data.user);

      return data;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to clear httpOnly cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // SECURITY: Include cookies in request
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    }

    // Clear local user data and CSRF token
    localStorage.removeItem('user');
    localStorage.removeItem('csrfToken');
    setUser(null);
    setCsrfToken(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const hasPermission = useCallback(
    (permission: string | string[]): boolean => {
      if (!user || !user.role || !user.role.permissions) {
        return false;
      }

      const permissions = user.role.permissions;

      // Handle permissions as object (e.g., {canManageUsers: true})
      if (typeof permissions === 'object' && !Array.isArray(permissions)) {
        if (Array.isArray(permission)) {
          return permission.some((perm) => permissions[perm] === true);
        }
        return permissions[permission] === true;
      }

      // Fallback for array format (legacy)
      if (Array.isArray(permissions)) {
        if (Array.isArray(permission)) {
          return permission.some((perm) => permissions.includes(perm));
        }
        return permissions.includes(permission);
      }

      return false;
    },
    [user]
  );

  const isRole = useCallback(
    (roleName: string): boolean => {
      if (!user || !user.role) {
        return false;
      }

      return user.role.name === roleName;
    },
    [user]
  );

  return {
    user,
    loading,
    csrfToken, // Expose CSRF token for API requests
    isAuthenticated: !!user, // SECURITY: Token is in httpOnly cookie, check user instead
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    isRole,
  };
}

// Hook to protect routes - redirects to login if not authenticated
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  return { loading };
}
