import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const target = process.env.BUILD_TARGET;
const distDir = path.join(rootDir, 'dist');
const targetDirs = new Set();

if (fs.existsSync(distDir)) {
  targetDirs.add(distDir);
  
  // dist 하위의 모든 서브디렉터리 (ops, dev, admin, pay, partner, kiosk 등) 자동 탐색
  const entries = fs.readdirSync(distDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      targetDirs.add(path.join(distDir, entry.name));
    }
  }
}

let handled = false;

for (const dir of targetDirs) {
  const indexHtml = path.join(dir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    const errorHtml = path.join(dir, '404.html');
    const nojekyll = path.join(dir, '.nojekyll');
    
    fs.copyFileSync(indexHtml, errorHtml);
    fs.writeFileSync(nojekyll, '');
    const redirectsFile = path.join(dir, '_redirects');
    if (!fs.existsSync(redirectsFile)) {
      fs.writeFileSync(redirectsFile, '/* /index.html 200\n');
    }
    console.log(`✅ [postbuild] Successfully created 404.html, _redirects, and .nojekyll in ${path.relative(rootDir, dir)}`);
    handled = true;
  }
}

if (!handled) {
  console.warn('⚠️ [postbuild] No index.html found to copy for 404.html fallback.');
}
