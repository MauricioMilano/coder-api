import server from './src/server';
import localtunnel from 'localtunnel';
import { config } from './src/config';

(async () => {
  const port = config.port || 3000;
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Server listening locally on port ${port}`);

  const tunnel = await localtunnel({ port });
  console.log(`LocalTunnel URL: ${tunnel.url}`);

  tunnel.on('close', () => {
    console.log('LocalTunnel closed');
  });
})();
