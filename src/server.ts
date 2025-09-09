import Fastify from 'fastify';
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
