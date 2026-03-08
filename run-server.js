import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

const distDir = path.join(__dirname, 'frontend/dist');
const storefrontDir = path.join(distDir, 'storefront');

app.use('/storefront', express.static(storefrontDir));

app.use('/templates', express.static(path.join(distDir, 'templates')));

app.use(express.static(distDir, {
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
  const indexPath = path.join(distDir, 'index.html');
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
