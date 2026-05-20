function isLoopback(hostname) {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host) return false;
  if (host === 'localhost' || host === '::1' || host === '[::1]') return true;
  return /^127(?:\.\d{1,3}){3}$/.test(host);
}

function normalizeOrigin(value, { required = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (required) throw new Error('Missing required API origin.');
    return '';
  }

  const url = new URL(raw);
  const protocol = String(url.protocol || '').toLowerCase();
  if (!['https:', 'http:'].includes(protocol)) {
    throw new Error(`Unsupported origin protocol for ${raw}`);
  }
  if (protocol === 'http:' && !isLoopback(url.hostname)) {
    throw new Error(`Non-local API origins must use HTTPS: ${raw}`);
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.origin;
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function directive(name, values) {
  return `${name} ${unique(values).join(' ')}`;
}

export function buildCareersCsp({ apiBase, isDev = false, includeFrameAncestors = false } = {}) {
  const apiOrigin = normalizeOrigin(apiBase, { required: true });
  const devConnect = isDev ? ["http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"] : [];
  const devScript = isDev ? ["'unsafe-inline'"] : [];

  const directives = [
    directive("default-src", ["'self'"]),
    directive("base-uri", ["'self'"]),
    directive("object-src", ["'none'"]),
    ...(includeFrameAncestors ? [directive("frame-ancestors", ["'none'"])] : []),
    directive("img-src", ["'self'", "data:", "blob:"]),
    directive("style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]),
    directive("font-src", ["'self'", "https://fonts.gstatic.com"]),
    directive("script-src", ["'self'", ...devScript, "https://challenges.cloudflare.com"]),
    directive("connect-src", ["'self'", apiOrigin, ...devConnect, "https://challenges.cloudflare.com"]),
    directive("frame-src", ["https://challenges.cloudflare.com"]),
  ];

  return `${directives.join('; ')};`;
}

export function buildCareersSecurityHeaders(options = {}) {
  return {
    'Content-Security-Policy': buildCareersCsp({ ...options, includeFrameAncestors: true }),
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}
