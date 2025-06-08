// src/middleware/security-headers.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

interface SecurityHeadersConfig {
  csp?: string;
  nonce?: string;
  apiUrls?: string[];
}

export const defaultConfig: SecurityHeadersConfig = {
  apiUrls: ['https://api.trustyconvert.com'],
};

export function securityHeaders(
  request: NextRequest,
  config: SecurityHeadersConfig = defaultConfig
) {
  const nonce = crypto.randomUUID();
  const csp = config.csp || `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline' ${
      process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""
    };
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self';
    connect-src 'self' ${config.apiUrls?.join(' ')};
    frame-ancestors 'none';
    base-uri 'none';
    form-action 'self';
    object-src 'none';
    media-src 'self' data: blob:;
    worker-src 'self' blob:;
    manifest-src 'self';
    frame-src 'none';
  `.replace(/\s{2,}/g, " ").trim();

  const response = NextResponse.next();
  
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  // Add nonce header for CSP
  response.headers.set("X-Content-Security-Policy-Nonce", nonce);
  
  return response;
}