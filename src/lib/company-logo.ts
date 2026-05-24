const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function resolveCompanyLogoUrl(value?: string | null) {
  if (!value) return null;

  if (value.includes('/api/uploads/company-logo?key=')) {
    return value;
  }

  if (value.startsWith('company-logos/')) {
    return `${API_BASE_URL}/uploads/company-logo?key=${encodeURIComponent(value)}`;
  }

  try {
    const parsed = new URL(value);
    const proxiedKey = parsed.searchParams.get('key');
    if (proxiedKey) {
      return `${API_BASE_URL}/uploads/company-logo?key=${encodeURIComponent(proxiedKey)}`;
    }

    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (pathname.startsWith('company-logos/')) {
      return `${API_BASE_URL}/uploads/company-logo?key=${encodeURIComponent(pathname)}`;
    }
  } catch {
    return value;
  }

  return value;
}
