import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
// Load environment variables from .env file if present
dotenv.config();
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
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

// Rotas
server.use('/projects', require('./routes/projects'));
server.use('/projects/:projectId/filetree', require('./routes/filetree'));
server.use('/projects/:projectId/files', require('./routes/files'));
server.use('/projects/:projectId/bash', require('./routes/bash'));


// Serve openapi.json at /openapi

import { readFileSync } from 'fs';
import { join } from 'path';

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
