// Use require to avoid missing type declarations for 'swagger-jsdoc'
const swaggerJSDoc: any = require('swagger-jsdoc');
import { join } from 'path';
import { config } from '../config';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Coder API',
      version: '1.0.0',
      description: 'API for the Coder agent',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local development server',
      },
    ],
  },
  // Scan these files for JSDoc annotations
  apis: [join(__dirname, '../routes/*.ts'), join(__dirname, '../mcp/*.ts')],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
