import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
// Wrangler dev port for the Cloudflare Workers backend. In production the
// worker serves both the SPA assets and /api/* on a single origin, so the
// proxy below only matters for the local Replit dev preview where the SPA
// runs on :5000 and the worker on :8000.
const BACKEND_PORT = 8000;

const frontendDir = path.join(__dirname, 'frontend');
const storefrontDir = path.join(frontendDir, 'storefront');

// Forward every /api/* request to the local wrangler worker. Without this,
// the Express catch-all below returns the SPA HTML for fetches like
// `/api/i18n/geo`, which then fail to JSON.parse and silently break i18n
// auto-detection in dev. We use raw `http.request` so we don't have to add
// a new npm dependency. Sets `cf-ipcountry: IN` for local testing of the
// India bucket; production gets the real country header from Cloudflare.
app.use('/api', (req, res) => {
  const headers = { ...req.headers, host: `localhost:${BACKEND_PORT}` };
  if (!headers['cf-ipcountry'] && !headers['CF-IPCountry']) {
    headers['cf-ipcountry'] = 'IN';
  }
  const proxyReq = http.request(
    {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: req.originalUrl,
      method: req.method,
      headers,
      // 30s ceiling so a hung wrangler dev process can't pin an Express
      // worker forever — surfaces a 504 to the SPA instead, which the
      // frontend's per-call error handlers already know how to recover from.
      timeout: 30_000,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('upstream timeout (30s)'));
  });
  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      const status = err.message?.includes('timeout') ? 504 : 502;
      res.status(status).json({ success: false, message: `Backend (:${BACKEND_PORT}) ${err.message}` });
    } else {
      res.end();
    }
  });
  req.pipe(proxyReq);
});

app.use('/storefront', express.static(storefrontDir));

app.use('/templates', express.static(path.join(frontendDir, 'templates')));

app.use('/images', express.static(path.join(storefrontDir, 'images')));

app.use('/assets', (req, res, next) => {
  const platformAsset = path.join(frontendDir, 'assets', req.path);
  const storefrontAsset = path.join(storefrontDir, 'assets', req.path);
  if (fs.existsSync(platformAsset)) {
    return res.sendFile(platformAsset);
  }
  if (fs.existsSync(storefrontAsset)) {
    return res.sendFile(storefrontAsset);
  }
  next();
});

app.use(express.static(frontendDir, {
  extensions: ['html'],
  index: 'index.html',
}));

app.get('/storefront/*', (req, res) => {
  const indexPath = path.join(storefrontDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Storefront not built. Run: node build.js');
  }
});

app.get('*', (req, res) => {
  const indexPath = path.join(frontendDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Platform not built. Run: node build.js');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Flomerce server running at http://0.0.0.0:${PORT}`);
  console.log(`  Platform:   http://0.0.0.0:${PORT}/`);
  console.log(`  Storefront: http://0.0.0.0:${PORT}/storefront/`);
});
