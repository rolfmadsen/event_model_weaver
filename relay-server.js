// relay-server.js

import Gun from 'gun'; // Only import the core GUN library
import http from 'http';

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enable CORS (essential)
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
  
  // Return 404 for other requests
  res.writeHead(404);
  res.end('Not found');
});

// Attach GUN to the server - MINIMAL options
const gun = Gun({
  web: server,    // Crucial: Attaches GUN's WebSocket handler
  localStorage: false,
  radisk: false
});

// Use PORT from environment (Koyeb sets this) or default to 8765 for local dev
const PORT = process.env.PORT || 8765; // 8765 is just a local fallback

server.listen(PORT, '0.0.0.0', () => { // Listen on all interfaces
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🔫 GUN Relay Server Running (Simplified) ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║   Port: ${PORT.toString().padEnd(35)} ║`);
  console.log('║   Mode: Stateless Relay                   ║');
  console.log('╚════════════════════════════════════════════╝');
});

// Log connections (useful for debugging)
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