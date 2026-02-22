import 'dotenv/config';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { server } from './server.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/mcp' && req.method === 'POST') {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
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
});
