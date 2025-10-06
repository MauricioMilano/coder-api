import { FastifyInstance } from "fastify";
import { runBashCommand } from "../core/bash";

export default async function (fastify: FastifyInstance) {
  fastify.post("/", async (req, reply) => {
    const { projectId } = req.params as any;
    try {
      const result = await runBashCommand(projectId, req.body);
      return reply.send(result);
    } catch (err: any) {
      return reply
        .status(err.statusCode || 500)
        .send({ error: err.message || "Execution error", details: err.details });
    }
  });
}