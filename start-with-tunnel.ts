import server from './src/server';
import ngrok from 'ngrok';
import { config } from './src/config';

(async () => {
  const port = config.port || 3000;
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Server listening locally on port ${port}`);

  const url = await ngrok.connect({ addr: port, proto: 'http' });
  console.log(`ChatGPT URL: ${url}/openapi`);
})();
