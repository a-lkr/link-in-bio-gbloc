import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { readFile } from 'node:fs/promises';
import { injectRouteMetadata, isKnownRoute, normalizePath, renderPublicPage } from './seo-server.mjs';

const port = Number(process.env.PORT || 5173);

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

const basePath = process.env.BASE_PATH || '/';
const apiPort = Number(process.env.GBLOC_API_PORT || 8080);
if (!Number.isSafeInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  throw new Error(`Invalid GBLOC_API_PORT value: "${process.env.GBLOC_API_PORT}"`);
}

export default defineConfig(async ({ isSsrBuild }) => ({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    {
      name: 'public-page-html',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!['GET', 'HEAD'].includes(req.method || '')) return next();
          const url = new URL(req.url || '/', 'http://localhost');
          const pathname = normalizePath(url.pathname);
          if (/^\/@(?:vite|id|fs)\//.test(pathname) || pathname === '/@react-refresh') return next();
          if (/^\/@[^/]+\/?$/.test(url.pathname)) {
            try {
              const upstream = await fetch(`http://127.0.0.1:${process.env.GBLOC_API_PORT || 8080}${url.pathname}${url.search}`, {
                redirect: 'manual',
                headers: {
                  host: req.headers.host || 'localhost',
                  'x-forwarded-proto': String(req.headers['x-forwarded-proto'] || 'http'),
                },
                signal: AbortSignal.timeout(5000),
              });
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/html');
              const location = upstream.headers.get('location');
              if (location) res.setHeader('Location', location);
              const html = await upstream.text();
              res.end(req.method === 'HEAD' ? undefined : await server.transformIndexHtml(url.pathname, html));
            } catch (error) {
              next(error);
            }
            return;
          }
          if (pathname === '/terms' || pathname === '/privacy') {
            res.writeHead(301, { Location: `/legal#${pathname.slice(1)}` });
            res.end();
            return;
          }
          if (!isKnownRoute(pathname) && /^\/[A-Za-z0-9_]{3,20}$/.test(pathname)) {
            res.writeHead(301, { Location: `/@${pathname.slice(1).toLowerCase()}` });
            res.end();
            return;
          }
          // Leave Vite's source modules, assets and internal requests alone.
          if (pathname.startsWith('/@') || pathname.startsWith('/src/') ||
              pathname.startsWith('/node_modules/') || pathname.startsWith('/__') ||
              path.extname(pathname)) return next();
          try {
            const content = await renderPublicPage(pathname, () => server.ssrLoadModule('/src/entry-server.tsx'));
            const template = await readFile(path.resolve(import.meta.dirname, 'index.html'), 'utf8');
            const html = injectRouteMetadata(template, req, pathname)
              .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
            res.statusCode = isKnownRoute(pathname) ? 200 : 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(req.method === 'HEAD' ? undefined : await server.transformIndexHtml(url.pathname, html));
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            res.statusCode = 503;
            res.end('The GBLOC public page is temporarily unavailable.');
            server.config.logger.error(String(error));
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: isSsrBuild ? 'entry-server.js' : 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: assetInfo => assetInfo.name?.endsWith('.css')
          ? 'assets/app.css'
          : 'assets/[name][extname]',
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: false,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
}));
