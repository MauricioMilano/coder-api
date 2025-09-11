// This script starts the Fastify server and exposes it via localtunnel
const server = require('./src/server').default;
const localtunnel = require('localtunnel');
const config = require('./src/config');

(async () => {
  const port = config.config.port || 3000;
  // Start Fastify server
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Server listening locally on port ${port}`);

  // Start localtunnel
  const tunnel = await localtunnel({ port });
  console.log(`LocalTunnel URL: ${tunnel.url}`);

  tunnel.on('close', () => {
    console.log('LocalTunnel closed');
  });
})();
