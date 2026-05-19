import { buildCareersCsp } from './csp.mjs';

function isLoopback(hostname) {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '::1' || host === '[::1]') return true;
  return /^127(?:\.\d{1,3}){3}$/.test(host);
}

function parseUrl(name, value, { required = true } = {}) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (required) throw new Error(`${name} is required.`);
    return null;
  }
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error(`${name} must use http(s).`);
  }
  if (url.protocol === 'http:' && !isLoopback(url.hostname)) {
    throw new Error(`${name} must use HTTPS outside localhost.`);
  }
  return url;
}

const issues = [];
const apiBase = process.env.VITE_API_BASE || '';

try {
  parseUrl('VITE_API_BASE', apiBase, { required: true });
} catch (error) {
  issues.push(error.message);
}

const turnstileKey = String(process.env.VITE_TURNSTILE_SITE_KEY || '').trim();
if (turnstileKey && !/^0x[a-zA-Z0-9]{20,}$/.test(turnstileKey)) {
  issues.push('VITE_TURNSTILE_SITE_KEY format looks invalid.');
}

try {
  const csp = buildCareersCsp({ apiBase, isDev: false });
  if (/localhost|\bws:|http:\/\/(?!localhost|127\.0\.0\.1)/i.test(csp)) {
    issues.push('Generated production CSP must not include localhost, ws:, or insecure http origins.');
  }
} catch (error) {
  issues.push(error.message || 'Failed to generate production CSP.');
}

if (issues.length > 0) {
  console.error('Careers runtime config validation failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Careers runtime config validation passed.');
