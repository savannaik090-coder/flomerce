import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, 'frontend');

function cleanAssets(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

console.log('Cleaning old build assets...');
cleanAssets(path.join(frontendDir, 'assets'));
cleanAssets(path.join(frontendDir, 'storefront', 'assets'));

console.log('Building Fluxe Platform...');
execSync('npm run build', { cwd: path.join(frontendDir, 'src/platform'), stdio: 'inherit' });

console.log('Building Fluxe Storefront...');
execSync('npm run build', { cwd: path.join(frontendDir, 'src/storefront'), stdio: 'inherit' });

console.log('Build complete!');
console.log('  Platform   -> frontend/index.html + frontend/assets/');
console.log('  Storefront -> frontend/storefront/');
