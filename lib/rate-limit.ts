import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimit = new Map<string, RateLimitRecord>();

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimit.entries()) {
    if (now > record.resetAt) {
      rateLimit.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function checkRateLimit(
  request: NextRequest,
  maxRequests: number,
  windowMs: number
): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export function getRateLimitHeaders(request: NextRequest, maxRequests: number, windowMs: number): {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
} {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetAt) {
    return {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - 1).toString(),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
    };
  }

  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count).toString(),
    'X-RateLimit-Reset': new Date(record.resetAt).toISOString(),
  };
}
