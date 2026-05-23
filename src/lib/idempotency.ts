'use client';

function fallbackUuid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createClientIdempotencyKey(scope: string) {
  const token =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : fallbackUuid();

  return `${scope}:${token}`;
}
