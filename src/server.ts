import Fastify from 'fastify';
import dotenv from 'dotenv';
// Load environment variables from .env file if present
dotenv.config();
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { problemErrorHandler } from './lib/problem-handler';

const server = Fastify({
  logger: { level: 'info' },
  genReqId: () => Math.random().toString(36).slice(2),
});

server.register(cors, { origin: true });
server.register(rateLimit, { max: 100, timeWindow: '1 minute' });



// Rotas
server.register(import('./routes/projects'), { prefix: '/projects' });
server.register(import('./routes/filetree'), { prefix: '/projects/:projectId/filetree' });
server.register(import('./routes/files'), { prefix: '/projects/:projectId/files' });
server.register(import('./routes/bash'), { prefix: '/projects/:projectId/bash' });
server.register(import('./routes/search'), { prefix: '/projects/:projectId/search' });


// Serve openapi.json at /openapi

import { readFileSync } from 'fs';
import { join } from 'path';
server.get('/openapi', async (request, reply) => {
  const openapiPath = join(__dirname, '../openapi.json');
  const openapiRaw = readFileSync(openapiPath, 'utf-8');
  let openapi;
  try {
    openapi = JSON.parse(openapiRaw);
  } catch (e) {
    reply.code(500).send({ error: 'Failed to parse OpenAPI spec' });
    return;
  }
  // Replace the servers[0].url with the current request host
  const protocol = request.headers['x-forwarded-proto'] || request.protocol;
  const host = request.headers['host'];
  if (openapi.servers && openapi.servers.length > 0) {
    openapi.servers[0].url = `${protocol}://${host}`;
  }
  reply.header('Content-Type', 'application/json').send(openapi);
});

server.setErrorHandler(problemErrorHandler as any);

export default server;

if (require.main === module) {
  server.listen({ port: config.port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    server.log.info(`Server listening at ${address}`);
  });
}
