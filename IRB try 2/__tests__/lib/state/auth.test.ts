import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/state/auth';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({ token: null, user: null });
  });

  it('should initialize with null token and user', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should login and set token and user', () => {
    const mockToken = 'test-jwt-token';
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: {
        id: 'role-1',
        name: 'researcher',
        permissions: ['view_studies', 'create_studies'],
      },
    };

    useAuthStore.getState().login(mockToken, mockUser);

    const state = useAuthStore.getState();
    expect(state.token).toBe(mockToken);
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated()).toBe(true);
  });

  it('should logout and clear token and user', () => {
    // First login
    const mockToken = 'test-jwt-token';
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: {
        id: 'role-1',
        name: 'researcher',
        permissions: ['view_studies'],
      },
    };

    useAuthStore.getState().login(mockToken, mockUser);
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    // Then logout
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should handle multiple logins (overwrite previous)', () => {
    const firstToken = 'token-1';
    const firstUser = {
      id: '1',
      email: 'user1@example.com',
      firstName: 'User',
      lastName: 'One',
      role: { id: 'r1', name: 'researcher', permissions: [] },
    };

    const secondToken = 'token-2';
    const secondUser = {
      id: '2',
      email: 'user2@example.com',
      firstName: 'User',
      lastName: 'Two',
      role: { id: 'r2', name: 'admin', permissions: ['manage_users'] },
    };

    useAuthStore.getState().login(firstToken, firstUser);
    expect(useAuthStore.getState().user?.id).toBe('1');

    useAuthStore.getState().login(secondToken, secondUser);
    expect(useAuthStore.getState().user?.id).toBe('2');
    expect(useAuthStore.getState().token).toBe(secondToken);
  });

  it('should return correct authentication status', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    useAuthStore.getState().login('token', {
      id: '1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: { id: 'r1', name: 'researcher', permissions: [] },
    });

    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });
});
