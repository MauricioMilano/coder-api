import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = Router({ mergeParams: true });

const initRoutes = async () => {
  const { getFile, createFile, patchFile, deleteFile } = await import('../core/files');

  // GET /projects/:projectId/files
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

  // POST /projects/:projectId/files
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

  // PATCH /projects/:projectId/files
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

  // DELETE /projects/:projectId/files
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

  // PATCH /projects/:projectId/files/replace - Replace text operations
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

  // PATCH /projects/:projectId/files/lines - Line-based operations
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

  // PATCH /projects/:projectId/files/code-block - Smart code block replacement
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

  // PATCH /projects/:projectId/files/insert - Insert at character position
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

  // PATCH /projects/:projectId/files/diff - Traditional unified diff
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