/**
 * Dev server with live reload for vehicle-tracker
 * Usage: node watch.js
 * Then open http://localhost:3000 in your browser.
 *
 * No npm install needed — uses only Node.js built-ins.
 * Any change to a file in this directory instantly reloads the browser.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const DIR  = __dirname;
const PORT = 3000;

const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css',
  '.js'   : 'application/javascript',
  '.json' : 'application/json',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.svg'  : 'image/svg+xml',
  '.ico'  : 'image/x-icon',
};

// Connected SSE clients waiting for reload signals
const clients = new Set();

function broadcast() {
  for (const res of clients) {
    try { res.write('data: reload\n\n'); } catch (_) { clients.delete(res); }
  }
}

// Debounce rapid successive saves (editor may write multiple times)
let debounce;
fs.watch(DIR, { recursive: false }, (event, filename) => {
  if (!filename || filename.startsWith('.')) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`[reload] ${filename}`);
    broadcast();
  }, 80);
});

const server = http.createServer((req, res) => {
  // ── Live-reload SSE endpoint ──────────────────────────────────────────────
  if (req.url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type' : 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection'   : 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // ── Static file server ────────────────────────────────────────────────────
  const urlPath  = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(DIR, urlPath);

  // Prevent path traversal outside DIR
  if (!filePath.startsWith(DIR)) { res.writeHead(403); res.end(); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Dev server ready → http://localhost:${PORT}`);
  console.log(`  Watching:          ${DIR}`);
  console.log('  Any file change will auto-reload the browser.\n');
});
