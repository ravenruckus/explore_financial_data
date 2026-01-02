interface SecurityConfig {
  allowedDomains: string[];
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  maxContentSizeBytes: number;
  fetchTimeoutMs: number;
}

export function getSecurityConfig(): SecurityConfig {
  return {
    allowedDomains: process.env.ALLOWED_PDF_DOMAINS?.split(',').map(d => d.trim()) || ['sec.gov'],
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxContentSizeBytes: parseInt(process.env.MAX_CONTENT_SIZE_BYTES || '10485760', 10),
    fetchTimeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS || '30000', 10),
  };
}
