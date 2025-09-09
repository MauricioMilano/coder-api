import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3007'),
  WORKSPACE_ROOT: z.string().min(1),
  ALLOW_NETWORK: z.enum(['true', 'false']).default('false'),
  MAX_FILE_SIZE: z.string().default('5000000'),
  MAX_STDOUT_BYTES: z.string().default('2000000'),
  BASH_TIMEOUT_SEC: z.string().default('120'),
  MAX_UPLOAD_MB: z.string().default('20'),
});

const env = envSchema.parse(process.env);

export const config = {
  port: parseInt(env.PORT, 10),
  workspaceRoot: env.WORKSPACE_ROOT,
  allowNetwork: env.ALLOW_NETWORK === 'true',
  maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
  maxStdoutBytes: parseInt(env.MAX_STDOUT_BYTES, 10),
  bashTimeoutSec: parseInt(env.BASH_TIMEOUT_SEC, 10),
  maxUploadMb: parseInt(env.MAX_UPLOAD_MB, 10),
};

// Swagger/OpenAPI config helper (for use in server.ts)
export const swaggerOptions = {
  openapi: {
    info: {
      title: 'Coder Backend API',
      version: 'v1.0.0',
      description: 'API REST minimalista para agente autônomo de modificação de projetos.',
    },
    servers: [{ url: 'http://localhost:' + (process.env.PORT || 3007) }],
  },
  exposeRoute: true,
  routePrefix: '/docs',
};
