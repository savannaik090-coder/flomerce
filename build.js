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

console.log('Building Fluxe Platform...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend/platform'), stdio: 'inherit' });

console.log('Building Fluxe Storefront...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend/storefront-src'), stdio: 'inherit' });

const platformDist = path.join(__dirname, 'frontend/platform/dist');
const storefrontDist = path.join(__dirname, 'frontend/storefront-src/dist');
const frontendDir = path.join(__dirname, 'frontend');

console.log('Copying Platform build to frontend/...');
const platformIndex = path.join(platformDist, 'index.html');
if (fs.existsSync(platformIndex)) {
  fs.copyFileSync(platformIndex, path.join(frontendDir, 'index.html'));
}
const platformAssets = path.join(platformDist, 'assets');
if (fs.existsSync(platformAssets)) {
  const destAssets = path.join(frontendDir, 'assets');
  if (fs.existsSync(destAssets)) {
    fs.rmSync(destAssets, { recursive: true });
  }
  copyDir(platformAssets, destAssets);
}

console.log('Copying Storefront build to frontend/storefront/...');
const storefrontDir = path.join(frontendDir, 'storefront');
if (fs.existsSync(storefrontDir)) {
  fs.rmSync(storefrontDir, { recursive: true });
}
copyDir(storefrontDist, storefrontDir);

console.log('Build complete!');
console.log('  Platform  -> frontend/index.html + frontend/assets/');
console.log('  Storefront -> frontend/storefront/');
