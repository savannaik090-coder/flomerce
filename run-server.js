import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(express.static(path.join(__dirname, 'frontend'), {
  extensions: ['html'],
  index: 'index.html',
}));

app.use('/templates', express.static(path.join(__dirname, 'frontend', 'templates')));

app.get('*', (req, res) => {
  const requestedPath = path.join(__dirname, 'frontend', req.path);
  const ext = path.extname(req.path);

  if (ext === '.html' || ext === '') {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fluxe frontend server running at http://0.0.0.0:${PORT}`);
});
