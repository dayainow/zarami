import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'public', 'images', 'docs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const routes = [
  { name: 'main', path: '/' },
  { name: 'manage-tree', path: '/manage-tree' },
  { name: 'world-map', path: '/world-map' },
  { name: 'trends', path: '/trends' }
];

async function capture() {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  
  for (const route of routes) {
    const url = `http://localhost:3000${route.path}`;
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      // wait a bit for any animations
      await new Promise(r => setTimeout(r, 2000));
      
      const outPath = path.join(outDir, `${route.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved screenshot to ${outPath}`);
    } catch (e) {
      console.error(`Failed to capture ${url}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
}

capture();
