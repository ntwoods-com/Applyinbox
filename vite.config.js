import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { buildCareersCsp, buildCareersSecurityHeaders } from './scripts/csp.mjs';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isGithubPages = process.env.VITE_GITHUB_PAGES === 'true';
const apiProxyTarget = (process.env.VITE_API_PROXY_TARGET || 'https://ntwoods.onrender.com/api').replace(/\/+$/, '');

const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function createApiProxyMiddleware() {
  async function proxyRequest(req, res, next) {
    if (!req.url?.startsWith('/api/')) {
      next();
      return;
    }

    try {
      const method = req.method || 'GET';
      const upstreamUrl = `${apiProxyTarget}${req.url.replace(/^\/api/, '')}`;
      const headers = new Headers();

      Object.entries(req.headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (!value || hopByHopHeaders.has(lowerKey) || lowerKey === 'origin') {
          return;
        }

        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      });

      let body;
      if (!['GET', 'HEAD'].includes(method)) {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        if (chunks.length) {
          body = Buffer.concat(chunks);
        }
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method,
        headers,
        body,
        redirect: 'manual',
      });

      res.statusCode = upstreamResponse.status;
      upstreamResponse.headers.forEach((value, key) => {
        if (!hopByHopHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.end(responseBuffer);
    } catch {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: 'Local API proxy could not reach the upstream application server.',
      }));
    }
  }

  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use(proxyRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(proxyRequest);
    },
  };
}

function createCspPlugin_(csp) {
  return {
    name: 'inject-careers-csp-meta',
    transformIndexHtml(html) {
      return html.replace('__CAREERS_CSP__', csp);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode !== 'production';
  const apiBase = env.VITE_API_BASE || process.env.VITE_API_PROXY_TARGET || 'https://ntwoods.onrender.com/api';
  const csp = buildCareersCsp({ apiBase, isDev });
  const securityHeaders = buildCareersSecurityHeaders({ apiBase, isDev });

  return {
    plugins: [react(), createApiProxyMiddleware(), createCspPlugin_(csp)],
    base: isGithubPages && repoName ? `/${repoName}/` : '/',
    server: {
      headers: securityHeaders,
    },
    preview: {
      headers: securityHeaders,
    },
  };
});
