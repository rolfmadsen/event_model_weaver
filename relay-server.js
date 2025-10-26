// Simple GUN relay server for real-time collaboration
// ES Module syntax for modern Node.js
// Stateless-friendly: no file storage, all data synced between peers

import Gun from 'gun';
import http from 'http';

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Basic health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('GUN relay server is running');
    return;
  }
  
  // For other requests, return 404
  res.writeHead(404);
  res.end('Not found');
});

// Attach GUN to the server
// NO file storage - relay only (stateless, perfect for Koyeb)
const gun = Gun({ 
  web: server,
  localStorage: false,  // Stateless mode
  radisk: false         // No disk storage
});

// Use PORT from environment (Koyeb sets this) or default to 8765
const PORT = process.env.PORT || 8765;

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🔫 GUN Relay Server Running             ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║   Port: ${PORT.toString().padEnd(35)} ║`);
  console.log('║   Mode: Stateless Relay (Koyeb-ready)     ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n💡 Update your gunService.ts peers to:');
  console.log(`   Local:  ['http://localhost:${PORT}/gun']`);
  console.log(`   Koyeb:  ['https://your-app.koyeb.app/gun']\n`);
});

// Log connections for debugging
gun.on('hi', (peer) => {
  console.log('🤝 Peer connected:', new Date().toISOString());
});

gun.on('bye', (peer) => {
  console.log('👋 Peer disconnected:', new Date().toISOString());
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down relay server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});