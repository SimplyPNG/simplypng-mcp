import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
dotenvConfig({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') });
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { server } from './server.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

// Store transport instances per session (required for StreamableHTTP session management)
const transports: Record<string, StreamableHTTPServerTransport> = {};

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/mcp' && req.method === 'POST') {
    try {
      // Read request body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks).toString('utf-8');
      const jsonBody = body ? JSON.parse(body) : {};

      // Get or create session
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? transports[sessionId] : undefined;

      if (!transport) {
        // New session - create transport
        const newSessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => newSessionId });
        
        // Store transport when session is initialized
        transport.onmessage = (msg) => {
          if ('method' in msg && msg.method === 'initialize') {
            console.log(`Session initialized: ${newSessionId}`);
            transports[newSessionId] = transport!;
          }
        };

        // Clean up on close
        transport.onclose = () => {
          console.log(`Session closed: ${newSessionId}`);
          delete transports[newSessionId];
        };

        // Connect to MCP server
        await server.connect(transport);
      }

      // Handle request with transport
      await transport.handleRequest(req, res, jsonBody);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
    return;
  }

  if (req.url === '/mcp' && req.method === 'GET') {
    // SSE endpoint for notifications
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const transport = sessionId ? transports[sessionId] : undefined;
    
    if (!transport) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
      return;
    }

    await transport.handleRequest(req, res);
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'simplypng-mcp', version: '0.1.0' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

httpServer.listen(PORT, () => {
  console.log(`simplypng-mcp HTTP server listening on port ${PORT}`);
  console.log(`MCP endpoint: POST http://localhost:${PORT}/mcp`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
});
