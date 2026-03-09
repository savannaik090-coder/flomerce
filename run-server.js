import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

const frontendDir = path.join(__dirname, 'frontend');
const storefrontDir = path.join(frontendDir, 'storefront');

app.use('/storefront', express.static(storefrontDir));

app.use('/templates', express.static(path.join(frontendDir, 'templates')));

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
  console.log(`Fluxe server running at http://0.0.0.0:${PORT}`);
  console.log(`  Platform:   http://0.0.0.0:${PORT}/`);
  console.log(`  Storefront: http://0.0.0.0:${PORT}/storefront/`);
});
