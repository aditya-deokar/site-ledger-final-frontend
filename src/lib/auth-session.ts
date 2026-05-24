'use client';

const AUTH_REDIRECT_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

let refreshPromise: Promise<boolean> | null = null;
let loginRedirectPending = false;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function redirectToLogin() {
  if (!isBrowser() || loginRedirectPending) return;

  const currentPath = window.location.pathname;
  if (AUTH_REDIRECT_PATHS.some((path) => currentPath.startsWith(path))) {
    return;
  }

  loginRedirectPending = true;
  window.location.replace('/login');
}

export function markSessionActive() {
  loginRedirectPending = false;
}

export async function refreshSession() {
  if (!isBrowser()) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
      .then(async (response) => {
        if (!response.ok) {
          return false;
        }

        loginRedirectPending = false;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
