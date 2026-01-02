import { getSecurityConfig } from '../config/security.config';

export class SSRFProtectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFProtectionError';
  }
}

/**
 * Validates that a URL belongs to an allowed domain
 * @param url - The URL to validate
 * @throws SSRFProtectionError if URL is not from an allowed domain
 */
export function validateAllowedDomain(url: string): void {
  const config = getSecurityConfig();
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  // Check if hostname matches or is a subdomain of allowed domains
  const isAllowed = config.allowedDomains.some((allowedDomain) => {
    const normalizedDomain = allowedDomain.toLowerCase();

    // Exact match
    if (hostname === normalizedDomain) {
      return true;
    }

    // Subdomain match (e.g., www.sec.gov matches sec.gov)
    if (hostname.endsWith(`.${normalizedDomain}`)) {
      return true;
    }

    return false;
  });

  if (!isAllowed) {
    throw new SSRFProtectionError(
      `Domain ${hostname} is not in the allowed domains list. Allowed domains: ${config.allowedDomains.join(', ')}`
    );
  }
}

/**
 * Validates Content-Type header to ensure it's HTML
 * @param contentType - The Content-Type header value
 * @throws Error if content type is not HTML
 */
export function validateContentType(contentType: string | null): void {
  if (!contentType) {
    throw new Error('Missing Content-Type header');
  }

  const normalizedType = contentType.toLowerCase();
  const allowedTypes = ['text/html', 'application/xhtml+xml', 'text/plain'];

  const isValid = allowedTypes.some(type => normalizedType.includes(type));

  if (!isValid) {
    throw new Error(`Invalid content type: ${contentType}. Expected HTML document.`);
  }
}

/**
 * Validates content size against maximum allowed
 * @param contentLength - Content-Length header value or actual content size
 * @throws Error if content is too large
 */
export function validateContentSize(contentLength: number): void {
  const config = getSecurityConfig();

  if (contentLength > config.maxContentSizeBytes) {
    const maxMB = (config.maxContentSizeBytes / (1024 * 1024)).toFixed(2);
    throw new Error(`Content size exceeds maximum allowed size of ${maxMB}MB`);
  }
}
