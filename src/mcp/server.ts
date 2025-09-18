import { McpServer } from "@modelcontextprotocol/sdk";
import { filesMcp } from "./files";
import { projectsMcp } from "./projects";
import { filetreeMcp } from "./filetree";
import { bashMcp } from "./bash";
import { dockerMcp } from "./docker";

export function setupMcpServer() {
  const server = new McpServer();

  // Files
  server.registerTool("files.read", filesMcp.read);
  server.registerTool("files.create", filesMcp.create);
  server.registerTool("files.edit", filesMcp.edit);
  server.registerTool("files.delete", filesMcp.delete);

  // Projects
  server.registerTool("projects.create", projectsMcp.create);
  server.registerTool("projects.editName", projectsMcp.editName);
  server.registerTool("projects.list", projectsMcp.list);
  server.registerTool("projects.get", projectsMcp.get);

  // Filetree
  server.registerTool("filetree.list", filetreeMcp.list);

  // Bash
  server.registerTool("bash.run", bashMcp.run);

  // Docker
  server.registerTool("docker.run", dockerMcp.run);
  server.registerTool("docker.status", dockerMcp.status);
  server.registerTool("docker.stop", dockerMcp.stop);

  return server;
}
