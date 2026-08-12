import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

const SUPER_ADMIN = {
  id: 'u-test-1',
  email: 'superadmin@Teamflow.com',
  name: 'Super Admin',
  role: 'SUPER_ADMIN'
};

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));

// The store calls relative URLs that only resolve behind the Vite proxy, so the
// network layer is stubbed here and the assertions cover the store's own logic.
const mockApi = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);

  if (url === '/api/auth/login') {
    const { email, password } = JSON.parse(String(init?.body ?? '{}'));
    if (email === SUPER_ADMIN.email && password === 'password123') {
      return json(200, { user: SUPER_ADMIN, token: 'test-token' });
    }
    return json(401, { error: 'Invalid credentials' });
  }

  if (url === '/api/auth/users') return json(200, [SUPER_ADMIN]);
  if (url === '/api/auth/invitations/pending') return json(200, []);

  return json(404, { error: `Unexpected request: ${url}` });
};

describe('authStore', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(mockApi));
    useAuthStore.getState().logout();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('can login successfully', async () => {
    await useAuthStore.getState().login('superadmin@Teamflow.com', 'password123');

    const newState = useAuthStore.getState();
    expect(newState.isAuthenticated).toBe(true);
    expect(newState.user?.role).toBe('SUPER_ADMIN');
    expect(newState.user?.email).toBe('superadmin@Teamflow.com');
    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('fails to login with bad credentials', async () => {
    await expect(
      useAuthStore.getState().login('wrong@email.com', 'badpass')
    ).rejects.toThrow('Invalid credentials');

    const newState = useAuthStore.getState();
    expect(newState.isAuthenticated).toBe(false);
    expect(newState.user).toBeNull();
    expect(newState.isLoading).toBe(false);
  });
});
