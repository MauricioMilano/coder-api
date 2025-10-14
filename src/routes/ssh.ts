import { Router, Request, Response } from 'express';
import { getProject } from '../core/projects';
import { generateSshKey, getPublicSshKey } from '../core/ssh';

const router = Router({ mergeParams: true });

// POST /projects/:projectId/ssh/keygen
router.post('/keygen', async (req: Request, res: Response) => {
  try {
    const project = await getProject(req.params.projectId);
    const result = await generateSshKey(project, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'SSH key generation failed', details: err.details });
  }
});

// GET /projects/:projectId/ssh/public-key
router.get('/public-key', async (req: Request, res: Response) => {
  try {
    const project = await getProject(req.params.projectId);
    const result = await getPublicSshKey(project, req.query);
    res.json(result);
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to read public key', details: err.details });
  }
});

module.exports = router;
