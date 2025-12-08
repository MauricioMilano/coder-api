import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = Router({ mergeParams: true });

const initRoutes = async () => {
  const { getFile, createFile, patchFile, deleteFile } = await import('../core/files');

  /**
   * @openapi
   * /projects/{projectId}/files:
   *   get:
   *     tags:
   *       - Files
   *     summary: Read a file from a project
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: path
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: encoding
   *         schema:
   *           type: string
   *           enum: [text, base64]
   *     responses:
   *       '200':
   *         description: File content
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FileContent'
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { path: filePath, encoding } = req.query as { path?: string, encoding?: 'text' | 'base64' };
      if (!filePath) {
        return res.status(400).json({ error: 'path parameter is required' });
      }
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await getFile(project, filePath, encoding || 'text');
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error reading file',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files:
   *   post:
   *     tags:
   *       - Files
   *     summary: Create a new file
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateFileRequest'
   *     responses:
   *       '200':
   *         description: Created file info
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await createFile(project, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error creating file',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files:
   *   patch:
   *     tags:
   *       - Files
   *     summary: Patch a file using a specified operation
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *               operation:
   *                 $ref: '#/components/schemas/PatchOperation'
   *     responses:
   *       '200':
   *         description: Patch result
   */
  router.patch('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await patchFile(project, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files:
   *   delete:
   *     tags:
   *       - Files
   *     summary: Delete a file
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Deletion result
   */
  router.delete('/', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      const result = await deleteFile(project, req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error deleting file',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files/replace:
   *   patch:
   *     tags:
   *       - Files
   *     summary: Replace text in a file
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *               find:
   *                 type: string
   *               replace:
   *                 type: string
   *               all:
   *                 type: boolean
   *     responses:
   *       '200':
   *         description: Replace result
   */
  router.patch('/replace', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const operation = {
        type: 'replace',
        find: req.body.find,
        replace: req.body.replace,
        all: req.body.all || false,
        case_sensitive: req.body.case_sensitive !== undefined ? req.body.case_sensitive : true,
        regex: req.body.regex || false
      };
      
      const result = await patchFile(project, { 
        path: req.body.path, 
        operation, 
        expected_hash: req.body.expected_hash,
        preview: req.body.preview || false
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file with replace operation',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files/lines:
   *   patch:
   *     tags:
   *       - Files
   *     summary: Line-based file operations
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *               action:
   *                 type: string
   *               line_number:
   *                 type: integer
   *               count:
   *                 type: integer
   *               content:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Lines operation result
   */
  router.patch('/lines', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const operation = {
        type: 'lines',
        action: req.body.action,
        line_number: req.body.line_number,
        count: req.body.count,
        content: req.body.content
      };
      
      const result = await patchFile(project, { 
        path: req.body.path, 
        operation, 
        expected_hash: req.body.expected_hash,
        preview: req.body.preview || false
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file with lines operation',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files/code-block:
   *   patch:
   *     tags:
   *       - Files
   *     summary: Replace code block in file using context
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *               find_context:
   *                 type: string
   *               replace_with:
   *                 type: string
   *               fuzzy_match:
   *                 type: boolean
   *               language:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Code block patch result
   */
  router.patch('/code-block', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const operation = {
        type: 'code_block',
        find_context: req.body.find_context,
        replace_with: req.body.replace_with,
        fuzzy_match: req.body.fuzzy_match !== undefined ? req.body.fuzzy_match : true,
        language: req.body.language
      };
      
      const result = await patchFile(project, { 
        path: req.body.path, 
        operation, 
        expected_hash: req.body.expected_hash,
        preview: req.body.preview || false
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file with code block operation',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files/insert:
   *   patch:
   *     tags:
   *       - Files
   *     summary: Insert content at a character position
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *               position:
   *                 type: integer
   *               content:
   *                 type: string
   *     responses:
   *       '200':
   *         description: Insert result
   */
  router.patch('/insert', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const operation = {
        type: 'insert',
        position: req.body.position,
        content: req.body.content
      };
      
      const result = await patchFile(project, { 
        path: req.body.path, 
        operation, 
        expected_hash: req.body.expected_hash,
        preview: req.body.preview || false
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file with insert operation',
        details: err.details,
      });
    }
  });

  /**
   * @openapi
   * /projects/{projectId}/files/diff:
   *   patch:
   *     tags:
   *       - Files
   *     summary: Apply a unified diff to a file
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               path:
   *                 type: string
   *               patch:
   *                 type: string
   *               fuzz_factor:
   *                 type: integer
   *     responses:
   *       '200':
   *         description: Diff applied result
   */
  router.patch('/diff', async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { config } = require('../config');
      const stateFile = path.join(config.workspaceRoot, '.state', `${projectId}.json`);
      const project = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      
      const operation = {
        type: 'diff',
        patch: req.body.patch,
        fuzz_factor: req.body.fuzz_factor || 0,
        auto_convert_line_endings: req.body.auto_convert_line_endings !== undefined ? req.body.auto_convert_line_endings : true
      };
      
      const result = await patchFile(project, { 
        path: req.body.path, 
        operation, 
        expected_hash: req.body.expected_hash,
        preview: req.body.preview || false
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        error: err.message || 'Error patching file with diff operation',
        details: err.details,
      });
    }
  });
};

initRoutes();

module.exports = router;