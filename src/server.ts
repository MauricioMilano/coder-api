import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import projectsRoutes from "./routes/projects";
import filetreeRoutes from "./routes/filetree";
import filesRoutes from "./routes/files";
import bashRoutes from "./routes/bash";
import dockerRoutes from "./routes/docker";
import { setupMcpServer } from "./mcp/server";

const server = Fastify({ logger: true });

server.register(cors, { origin: true });
server.register(rateLimit, { max: 100, timeWindow: "1 minute" });

server.register(projectsRoutes, { prefix: "/projects" });
server.register(filetreeRoutes, { prefix: "/projects/:projectId/filetree" });
server.register(filesRoutes, { prefix: "/projects/:projectId/files" });
server.register(bashRoutes, { prefix: "/projects/:projectId/bash" });
server.register(dockerRoutes, { prefix: "/projects/:projectId/docker" });

server.get("/openapi", async (_, reply) => {
  const openapi = require("../openapi.json");
  return reply.send(openapi);
});

// 🚀 Start MCP server alongside Fastify
const mcpServer = setupMcpServer();
mcpServer.listen(); // transport can be configured (stdio, http, ws)

if (require.main === module) {
  server.listen({ port: 3000, host: "0.0.0.0" });
}

export default server;
