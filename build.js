import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, 'frontend');

console.log('Building Fluxe Platform...');
execSync('npm run build', { cwd: path.join(frontendDir, 'src/platform'), stdio: 'inherit' });

console.log('Building Fluxe Storefront...');
execSync('npm run build', { cwd: path.join(frontendDir, 'src/storefront'), stdio: 'inherit' });

console.log('Build complete!');
console.log('  Platform   -> frontend/index.html + frontend/assets/');
console.log('  Storefront -> frontend/storefront/');
