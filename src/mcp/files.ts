import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getProject } from '../core/projects';
import { 
  getFile, 
  createFile, 
  deleteFile,
  patchFile
} from '../core/files';

export function registerFileTools(mcpServer: McpServer) {
  // Get File
  mcpServer.registerTool(
    'get-file',
    {
      title: 'Get File Content',
      description: 'Read the content of a file in a project',
      inputSchema: {
        projectId: z.string(),
        filePath: z.string(),
        encoding: z.enum(['text', 'base64']).default('text')
      },
      outputSchema: {
        path: z.string(),
        content: z.string(),
        hash: z.string()
      }
    },
    async ({ projectId, filePath, encoding }) => {
      try {
        const project = await getProject(projectId);
        const result = await getFile(project, filePath, encoding);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Create File
  mcpServer.registerTool(
    'create-file',
    {
      title: 'Create File',
      description: 'Create a new file in a project',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        content: z.string(),
        encoding: z.enum(['text', 'base64']).default('text'),
        overwrite: z.boolean().default(false)
      },
      outputSchema: {
        path: z.string(),
        hash: z.string()
      }
    },
    async ({ projectId, path, content, encoding, overwrite }) => {
      try {
        const project = await getProject(projectId);
        const result = await createFile(project, { path, content, encoding, overwrite });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Delete File
  mcpServer.registerTool(
    'delete-file',
    {
      title: 'Delete File',
      description: 'Delete a file or directory in a project',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        recursive: z.boolean().default(false),
        missing_ok: z.boolean().default(false)
      },
      outputSchema: {
        deleted: z.boolean()
      }
    },
    async ({ projectId, path, recursive, missing_ok }) => {
      try {
        const project = await getProject(projectId);
        const result = await deleteFile(project, { path, recursive, missing_ok });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Patch Replace - Find and replace text
  mcpServer.registerTool(
    'patch-replace',
    {
      title: 'Patch File - Replace Text',
      description: 'Find and replace text in a file. Use for simple text substitutions, imports, variable names.',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        find: z.string().describe('Text to find and replace'),
        replace: z.string().describe('Replacement text'),
        all: z.boolean().default(false).describe('Replace all occurrences, not just the first'),
        case_sensitive: z.boolean().default(true).describe('Whether the search is case sensitive'),
        regex: z.boolean().default(false).describe('Whether to treat find pattern as regex'),
        expected_hash: z.string().optional().describe('Expected SHA256 hash for validation'),
        preview: z.boolean().default(false).describe('Preview changes without applying them')
      },
      outputSchema: {
        path: z.string(),
        hash: z.string().optional(),
        preview: z.boolean().optional(),
        original_hash: z.string().optional(),
        modified_hash: z.string().optional(),
        bytes_before: z.number().optional(),
        bytes_after: z.number().optional(),
        diff_preview: z.string().optional(),
        stats: z.object({
          operation: z.string(),
          replacements_made: z.number().optional(),
          pattern: z.string().optional()
        }).optional()
      }
    },
    async ({ projectId, path, find, replace, all, case_sensitive, regex, expected_hash, preview }) => {
      try {
        const project = await getProject(projectId);
        const operation = {
          type: 'replace' as const,
          find,
          replace,
          all,
          case_sensitive,
          regex
        };
        
        const result = await patchFile(project, { path, operation, expected_hash, preview });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Patch Lines - Insert, delete, or replace specific lines
  mcpServer.registerTool(
    'patch-lines',
    {
      title: 'Patch File - Line Operations',
      description: 'Insert, delete, or replace specific lines in a file. Use for adding imports, deleting code blocks.',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        action: z.enum(['insert', 'delete', 'replace']).describe('Action to perform on lines'),
        line_number: z.number().describe('Line number to operate on (1-based)'),
        count: z.number().optional().describe('Number of lines to delete/replace (for delete/replace actions)'),
        content: z.string().optional().describe('Content to insert/replace (for insert/replace actions)'),
        expected_hash: z.string().optional().describe('Expected SHA256 hash for validation'),
        preview: z.boolean().default(false).describe('Preview changes without applying them')
      },
      outputSchema: {
        path: z.string(),
        hash: z.string().optional(),
        preview: z.boolean().optional(),
        original_hash: z.string().optional(),
        modified_hash: z.string().optional(),
        bytes_before: z.number().optional(),
        bytes_after: z.number().optional(),
        diff_preview: z.string().optional(),
        stats: z.object({
          operation: z.string(),
          action: z.string().optional()
        }).optional()
      }
    },
    async ({ projectId, path, action, line_number, count, content, expected_hash, preview }) => {
      try {
        const project = await getProject(projectId);
        const operation = {
          type: 'lines' as const,
          action,
          line_number,
          count,
          content
        };
        
        const result = await patchFile(project, { path, operation, expected_hash, preview });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Patch Code Block - Smart replacement of code blocks
  mcpServer.registerTool(
    'patch-code-block',
    {
      title: 'Patch File - Code Block Replacement',
      description: 'Smart replacement of code blocks, functions, or classes. Use for replacing entire functions or code structures.',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        find_context: z.string().describe('Context to identify the code block (e.g., function name, class name)'),
        replace_with: z.string().describe('New code block content'),
        fuzzy_match: z.boolean().default(true).describe('Allow fuzzy matching for context'),
        language: z.string().optional().describe('Programming language for better context understanding'),
        expected_hash: z.string().optional().describe('Expected SHA256 hash for validation'),
        preview: z.boolean().default(false).describe('Preview changes without applying them')
      },
      outputSchema: {
        path: z.string(),
        hash: z.string().optional(),
        preview: z.boolean().optional(),
        original_hash: z.string().optional(),
        modified_hash: z.string().optional(),
        bytes_before: z.number().optional(),
        bytes_after: z.number().optional(),
        diff_preview: z.string().optional(),
        stats: z.object({
          operation: z.string(),
          context_found: z.boolean().optional()
        }).optional()
      }
    },
    async ({ projectId, path, find_context, replace_with, fuzzy_match, language, expected_hash, preview }) => {
      try {
        const project = await getProject(projectId);
        const operation = {
          type: 'code_block' as const,
          find_context,
          replace_with,
          fuzzy_match,
          language
        };
        
        const result = await patchFile(project, { path, operation, expected_hash, preview });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Patch Insert - Insert content at specific position
  mcpServer.registerTool(
    'patch-insert',
    {
      title: 'Patch File - Insert at Position',
      description: 'Insert content at a specific character position. Use for file headers, footers, or precise insertions.',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        position: z.number().describe('Character position to insert at (0-based)'),
        content: z.string().describe('Content to insert'),
        expected_hash: z.string().optional().describe('Expected SHA256 hash for validation'),
        preview: z.boolean().default(false).describe('Preview changes without applying them')
      },
      outputSchema: {
        path: z.string(),
        hash: z.string().optional(),
        preview: z.boolean().optional(),
        original_hash: z.string().optional(),
        modified_hash: z.string().optional(),
        bytes_before: z.number().optional(),
        bytes_after: z.number().optional(),
        diff_preview: z.string().optional(),
        stats: z.object({
          operation: z.string(),
          position: z.number().optional()
        }).optional()
      }
    },
    async ({ projectId, path, position, content, expected_hash, preview }) => {
      try {
        const project = await getProject(projectId);
        const operation = {
          type: 'insert' as const,
          position,
          content
        };
        
        const result = await patchFile(project, { path, operation, expected_hash, preview });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );

  // Patch Diff - Traditional unified diff
  mcpServer.registerTool(
    'patch-diff',
    {
      title: 'Patch File - Unified Diff',
      description: 'Apply a traditional unified diff patch. Use for complex changes when you have a proper diff format.',
      inputSchema: {
        projectId: z.string(),
        path: z.string(),
        patch: z.string().describe('Unified diff patch content'),
        fuzz_factor: z.number().default(0).describe('Fuzz factor for patch matching (0-10)'),
        auto_convert_line_endings: z.boolean().default(true).describe('Automatically convert line endings'),
        expected_hash: z.string().optional().describe('Expected SHA256 hash for validation'),
        preview: z.boolean().default(false).describe('Preview changes without applying them')
      },
      outputSchema: {
        path: z.string(),
        hash: z.string().optional(),
        preview: z.boolean().optional(),
        original_hash: z.string().optional(),
        modified_hash: z.string().optional(),
        bytes_before: z.number().optional(),
        bytes_after: z.number().optional(),
        diff_preview: z.string().optional(),
        stats: z.object({
          operation: z.string(),
          lines_added: z.number().optional(),
          lines_removed: z.number().optional(),
          hunk_count: z.number().optional()
        }).optional()
      }
    },
    async ({ projectId, path, patch, fuzz_factor, auto_convert_line_endings, expected_hash, preview }) => {
      try {
        const project = await getProject(projectId);
        const operation = {
          type: 'diff' as const,
          patch,
          fuzz_factor,
          auto_convert_line_endings
        };
        
        const result = await patchFile(project, { path, operation, expected_hash, preview });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || JSON.stringify(error)}` }],
          isError: true
        };
      }
    }
  );
}