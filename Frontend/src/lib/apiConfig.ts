/**
 * Dynamic Backend URL configuration.
 * Automatically adapts between:
 * - Localhost development (http://localhost:5000)
 * - Mobile / LAN device access (http://<your-laptop-ip>:5000)
 * - Production / Deployed environment (VITE_BACKEND_URL)
 */

export const getBackendUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }

  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  // If an explicit remote production URL is specified (e.g. on Vercel)
  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // When accessing from mobile phone or other device on same Wi-Fi (e.g. 192.168.1.X:5173):
  // window.location.hostname is the host machine IP. Connect directly to host port 5000!
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${protocol}//${hostname}:5000`;
  }

  return 'http://localhost:5000';
};

export const BACKEND_URL = getBackendUrl();
