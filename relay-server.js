// relay-server.js (Temporary WebSocket Echo Server)

import { WebSocketServer } from 'ws';
import http from 'http';

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Basic health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Minimal WS Server Running'); // Change message slightly
    return;
  }
  
  // Respond 404 for anything else (like /gun)
  res.writeHead(404);
  res.end('Not Found');
});

// Create a WebSocket server attached to the HTTP server
// It will handle requests that try to upgrade the connection
const wss = new WebSocketServer({ server }); // NOTE: No path specified here

wss.on('connection', function connection(ws, req) {
  const clientIp = req.socket.remoteAddress;
  console.log(`WebSocket client connected: ${clientIp}`);

  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log(`Received: ${data}`);
    // Echo the message back to the client
    ws.send(`Echo: ${data}`);
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected: ${clientIp}`);
  });

  ws.send('Welcome to the Echo Server!');
});

// Use PORT from environment (Koyeb sets this) or fallback for local dev
const PORT = process.env.PORT || 8765; // Keep 8765 fallback

server.listen(PORT, '0.0.0.0', () => {
  console.log(`╔════════════════════════════════════════════╗`);
  console.log(`║   🧪 Minimal WebSocket Server Running     ║`);
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║   Listening on port ${PORT.toString().padEnd(25)} ║`);
  console.log('╚════════════════════════════════════════════╝');
});

// Graceful shutdown (same as before)
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
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