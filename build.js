import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const distDir = path.join(__dirname, 'frontend/dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log('Building Fluxe Platform...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend/platform'), stdio: 'inherit' });

console.log('Building Fluxe Storefront...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend/storefront'), stdio: 'inherit' });

const platformDist = path.join(__dirname, 'frontend/platform/dist');
const storefrontDist = path.join(__dirname, 'frontend/storefront/dist');

console.log('Copying Platform build to frontend/dist/...');
const platformIndex = path.join(platformDist, 'index.html');
if (fs.existsSync(platformIndex)) {
  fs.copyFileSync(platformIndex, path.join(distDir, 'index.html'));
}
const platformAssets = path.join(platformDist, 'assets');
if (fs.existsSync(platformAssets)) {
  copyDir(platformAssets, path.join(distDir, 'assets'));
}

console.log('Copying Storefront build to frontend/dist/storefront/...');
copyDir(storefrontDist, path.join(distDir, 'storefront'));

console.log('Copying templates to frontend/dist/templates/...');
const templatesDir = path.join(__dirname, 'frontend/templates');
if (fs.existsSync(templatesDir)) {
  copyDir(templatesDir, path.join(distDir, 'templates'));
}

console.log('Build complete!');
console.log('  Platform   -> frontend/dist/index.html + frontend/dist/assets/');
console.log('  Storefront -> frontend/dist/storefront/');
console.log('  Templates  -> frontend/dist/templates/');
