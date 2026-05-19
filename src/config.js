function getDefaultApiBase() {
  if (typeof window !== 'undefined') {
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
    if (localHosts.has(window.location.hostname)) {
      return '/api';
    }
  }

  return 'https://ntwoods.onrender.com/api';
}

const DEFAULT_API_BASE = getDefaultApiBase();
const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAACVpKor7RIjOUDfl';

function getRuntimeConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.NTW_CAREERS_CONFIG || {};
}

function normalizeApiBase(candidate) {
  if (!candidate) return '';

  try {
    const url = new URL(candidate, typeof window !== 'undefined' ? window.location.origin : DEFAULT_API_BASE);
    const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const isAllowedProtocol = url.protocol === 'https:' || (isLocalHost && url.protocol === 'http:');

    if (!isAllowedProtocol) {
      return '';
    }

    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function normalizeTurnstileKey(candidate) {
  const value = String(candidate || '').trim();
  return /^0x[a-zA-Z0-9]{20,}$/.test(value) ? value : '';
}

const runtimeConfig = getRuntimeConfig();

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE || runtimeConfig.API_BASE) || DEFAULT_API_BASE;

export const TURNSTILE_SITE_KEY =
  normalizeTurnstileKey(import.meta.env.VITE_TURNSTILE_SITE_KEY || runtimeConfig.TURNSTILE_SITE_KEY) ||
  DEFAULT_TURNSTILE_SITE_KEY;
