export function getApiErrorMessage(error: unknown, fallback = 'Request failed.') {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }

    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }

  return fallback;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  return typeof error.status === 'number' ? error.status : undefined;
}
