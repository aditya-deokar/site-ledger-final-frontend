const ERROR_CODE_MAP: Record<string, string> = {
  'INSUFFICIENT_FUNDS': 'Insufficient balance in the site fund to record this expense.',
  'UNAUTHORIZED': 'Your session has expired. Please log in again.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'NOT_FOUND': 'The requested information could not be found.',
  'INTERNAL_SERVER_ERROR': 'A server error occurred. Please try again later.',
  'BAD_REQUEST': 'The request was invalid. Please check your input.',
  'VALIDATION_ERROR': 'Form validation failed. Please check the fields.',
};

export function getApiErrorMessage(error: unknown, fallback = 'Request failed.') {
  if (typeof error === 'string') {
    return ERROR_CODE_MAP[error] || error;
  }

  if (error && typeof error === 'object') {
    // Check for "error" property which usually contains the code
    const errObj = error as any;
    const code = errObj.error || errObj.code;
    const message = errObj.message;

    if (code && typeof code === 'string' && ERROR_CODE_MAP[code]) {
      return ERROR_CODE_MAP[code];
    }

    if (typeof code === 'string' && code.length > 0) {
      return code.replace(/_/g, ' ');
    }

    if (message && typeof message === 'string') {
      return message;
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
