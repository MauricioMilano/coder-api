import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
// Load environment variables from .env file if present
dotenv.config();
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import { problemErrorHandler } from './lib/problem-handler';

const server = express();

// Logger setup
const logger = pino({ level: 'info' });

// Simple logging middleware
server.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Middleware
server.use(cors({ origin: true }));
server.use(express.json({ limit: `${config.maxUploadMb}mb` }));
server.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
});
server.use(limiter);

// Request ID middleware
server.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).id = Math.random().toString(36).slice(2);
  next();
});

// REST API Routes
server.use('/projects', require('./routes/projects'));
server.use('/projects/:projectId/filetree', require('./routes/filetree'));
server.use('/projects/:projectId/files', require('./routes/files'));
server.use('/projects/:projectId/bash', require('./routes/bash'));

// MCP Server integration - Add MCP endpoints to the main server
import { mcpServer } from './mcp-server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { randomUUID } from 'crypto';

// Store MCP SSE transports by session ID
const mcpSseTransports = new Map<string, SSEServerTransport>();

// Add MCP endpoint with CORS support (Streamable HTTP)
server.options('/mcp', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  res.sendStatus(200);
});

server.post('/mcp', async (req: Request, res: Response) => {
  // Set CORS headers for MCP endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => {
    transport.close();
  });

  try {
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// MCP SSE Transport Support
server.get('/mcp-sse', async (req: Request, res: Response) => {
  // Set CORS headers for SSE
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Cache-Control');
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  try {
    // Create SSE transport for MCP
    const transport = new SSEServerTransport('/mcp-messages', res);
    const sessionId = transport.sessionId;
    
    // Store transport for message handling
    mcpSseTransports.set(sessionId, transport);

    res.on('close', () => {
      mcpSseTransports.delete(sessionId);
      logger.info(`MCP SSE client ${sessionId} disconnected`);
    });

    res.on('error', (error) => {
      logger.error(`MCP SSE client ${sessionId} error:`, error);
      mcpSseTransports.delete(sessionId);
    });

    // Connect MCP server to SSE transport
    await mcpServer.connect(transport);
    logger.info(`MCP SSE client ${sessionId} connected`);

  } catch (error) {
    logger.error('MCP SSE connection error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to establish MCP SSE connection'
      });
    }
  }
});

// MCP SSE Message endpoint
server.post('/mcp-messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const transport = mcpSseTransports.get(sessionId);
  if (!transport) {
    return res.status(400).json({ error: 'No transport found for session ID' });
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    logger.error('MCP SSE message error:', error);
    res.status(500).json({ error: 'Failed to handle MCP message' });
  }
});




// Server capabilities endpoint
server.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    name: 'Coder API Server',
    version: '1.0.0',
    protocols: {
      rest: {
        enabled: true,
        description: 'RESTful API for project management',
        endpoints: [
          '/projects',
          '/projects/:projectId/filetree',
          '/projects/:projectId/files',
          '/projects/:projectId/bash'
        ]
      },
      mcp: {
        enabled: true,
        description: 'Model Context Protocol for LLM integration',
        transports: {
          streamableHttp: '/mcp',
          sse: '/mcp-sse'
        },
        tools: [
          'create-project',
          'rename-project',
          'get-file',
          'create-file',
          'delete-file',
          'patch-file',
          'run-bash'
        ],
        resources: [
          'projects://list',
          'project://{projectId}',
          'filetree://{projectId}',
          'file://{projectId}/{filePath}'
        ]
      }
    },
    activeConnections: {
      mcpSse: mcpSseTransports.size
    }
  });
});

// Serve openapi.json at /openapi
server.get('/openapi*', async (request: Request, response: Response) => {
  const openapiPath = join(__dirname, '../openapi.json');
  const openapiRaw = readFileSync(openapiPath, 'utf-8');
  let openapi;
  try {
    openapi = JSON.parse(openapiRaw);
  } catch (e) {
    response.status(500).json({ error: 'Failed to parse OpenAPI spec' });
    return;
  }
  // Replace the servers[0].url with the current request host
  const protocol = request.headers['x-forwarded-proto'] || request.protocol;
  const host = request.headers['host'];
  if (openapi.servers && openapi.servers.length > 0) {
    openapi.servers[0].url = `${protocol}://${host}`;
  }
  response.setHeader('Content-Type', 'application/json').json(openapi);
});

// Error handler middleware (must be last)
server.use(problemErrorHandler);

export default server;

if (require.main === module) {
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`Server listening at http://0.0.0.0:${config.port}`);
  });
}
