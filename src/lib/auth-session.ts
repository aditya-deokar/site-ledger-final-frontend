'use client';

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_REDIRECT_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

let refreshPromise: Promise<string | null> | null = null;
let loginRedirectPending = false;

type TokenPayload = {
  exp?: number;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function decodeTokenPayload(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    return JSON.parse(window.atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
}

export function getStoredAccessToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasStoredSession() {
  return Boolean(getStoredAccessToken() || getStoredRefreshToken());
}

export function isTokenExpiringSoon(token: string, bufferMs: number = 30_000) {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return true;

  const expiresAtMs = payload.exp * 1000;
  return expiresAtMs - Date.now() <= bufferMs;
}

export function storeTokens(tokens: { accessToken: string; refreshToken: string }) {
  if (!isBrowser()) return;

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  loginRedirectPending = false;
}

export function clearStoredTokens() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
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

export async function refreshAccessToken() {
  if (!isBrowser()) return null;

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .then((response) => {
        const nextAccessToken = response.data?.data?.accessToken;
        const nextRefreshToken = response.data?.data?.refreshToken;

        if (!nextAccessToken || !nextRefreshToken) {
          clearStoredTokens();
          return null;
        }

        storeTokens({
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        });

        return nextAccessToken;
      })
      .catch(() => {
        clearStoredTokens();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function ensureFreshAccessToken(bufferMs: number = 30_000) {
  if (!isBrowser()) return null;

  const accessToken = getStoredAccessToken();
  if (accessToken && !isTokenExpiringSoon(accessToken, bufferMs)) {
    return accessToken;
  }

  return refreshAccessToken();
}
