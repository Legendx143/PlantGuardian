/**
 * Dynamic Backend URL configuration.
 * Automatically adapts between:
 * - Localhost development: http://localhost:5000
 * - Mobile / LAN device access: http://<your-laptop-ip>:5000
 * - Production / Deployed environment (Vercel, custom domain): '' (same origin /api)
 */

export const getBackendUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  // If an explicit remote production backend URL is specified
  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Local computer development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  // Mobile phone or other device accessing host laptop via LAN IP (e.g. 192.168.x.x or 10.x.x.x)
  const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname) || hostname.endsWith('.local');
  if (isPrivateIp) {
    return `${protocol}//${hostname}:5000`;
  }

  // On production web deployments (e.g. plantguardian-sooty.vercel.app or any domain):
  // Use relative '/api' endpoints on the same domain (Vercel serverless / proxy)
  return '';
};

export const BACKEND_URL = getBackendUrl();
