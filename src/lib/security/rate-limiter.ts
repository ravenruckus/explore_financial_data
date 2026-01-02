import { getSecurityConfig } from '../config/security.config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed under rate limit
   * @param identifier - Usually IP address
   * @returns Object with allowed status and remaining attempts
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const config = getSecurityConfig();
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // No existing entry or expired entry
    if (!entry || now > entry.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.rateLimitWindowMs,
      });
      return {
        allowed: true,
        remaining: config.rateLimitMaxRequests - 1,
        resetTime: now + config.rateLimitWindowMs,
      };
    }

    // Existing entry within window
    if (entry.count >= config.rateLimitMaxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count += 1;
    this.requests.set(identifier, entry);

    return {
      allowed: true,
      remaining: config.rateLimitMaxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.requests.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.requests.delete(key));

    console.log(`Rate limiter cleanup: Removed ${keysToDelete.length} expired entries`);
  }

  /**
   * Get current stats (for monitoring/debugging)
   */
  getStats(): { totalEntries: number } {
    return {
      totalEntries: this.requests.size,
    };
  }

  /**
   * Cleanup interval on shutdown (important for testing)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Helper to extract IP from Next.js request
 * @param request - NextRequest object
 * @returns IP address or 'unknown'
 */
export function getClientIP(request: Request): string {
  // Check common headers for IP address (in order of preference)
  const headers = request.headers;

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  // Standard forwarded header
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  // Other common headers
  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  // Vercel-specific
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) return vercelForwardedFor.split(',')[0].trim();

  return 'unknown';
}
