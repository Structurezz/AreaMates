const http = require('http');
const fs   = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
  '.mp3':  'audio/mpeg',
};

const dist = path.join(__dirname, 'dist');
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  const urlPath  = req.url.split('?')[0];
  let   filePath = path.join(dist, urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(dist, 'index.html');
  }

  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mimeType);
  // Only Vite's fingerprinted /assets/* are safe to cache forever. Everything
  // else (index.html, sw.js, manifest, icons, sounds) must revalidate so
  // updates — especially the service worker — reach phones.
  res.setHeader('Cache-Control', urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');

  fs.createReadStream(filePath)
    .on('error', () => {
      res.writeHead(404);
      res.end('Not found');
    })
    .pipe(res);
}).listen(port, () => console.log(`AreaMates running on port ${port}`));
